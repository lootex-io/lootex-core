import * as AWS from '@aws-sdk/client-sqs';
import pg from 'pg';

const pool = new pg.Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USERNAME,
    password: process.env.POSTGRES_PASSWORD,
});

const sqs = new AWS.SQSClient({
    credentials: {
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
    },
    region: process.env.AWS_SQS_REGION,
});

export const handler = async (event) => {
    const steamUsers = JSON.parse(event.Records[0].body);
    const receiptHandle = event.Records[0].receiptHandle;
    await updateSteamUsersInfoFromQueue(steamUsers, receiptHandle);

    const response = {
        statusCode: 200,
        body: JSON.stringify({ status: 'success' }),
    };
    return response;
};

async function updateSteamUsersInfoFromQueue(steamUsers, receiptHandle) {
    const client = await pool.connect();
    let _steamUsers;
    try {
        const result = await client.query(
            `SELECT account_id, steam_id FROM account_steam_info WHERE account_id IN (${steamUsers
                .map(({ accountId }) => `'${accountId}'`)
                .join(',')})`,
        );
        _steamUsers = result.rows;
    } catch (error) {
        console.error('Error executing query:', error.message || error);
    } finally {
        client.release();
    }
    const verifiedSteamUsers = [];
    steamUsers.forEach((steamUser) => {
        let hasAccount = false;
        _steamUsers.forEach((_steamUser) => {
            if (steamUser.accountId === _steamUser.account_id) {
                if (steamUser.steamId === _steamUser.steam_id) {
                    verifiedSteamUsers.push({
                        accountId: steamUser.accountId,
                        steamId: steamUser.steamId,
                    });
                }
                hasAccount = true;
            }
        });
        if (!hasAccount) {
            verifiedSteamUsers.push({
                accountId: steamUser.accountId,
                steamId: steamUser.steamId,
            });
        }
    });

    const steamUsersInfo = await Promise.all(
        verifiedSteamUsers.map(async (steamUser) => {
            console.log(
                `updateSteamUsersInfoFromQueue: steam id:${steamUser.steamId}`,
            );
            try {
                const steamUserInfo = await getSteamUserInfo(steamUser.steamId);
                return {
                    hasError: false,
                    ...steamUser,
                    ...steamUserInfo,
                };
            } catch (e) {
                if (/429/.test(e)) {
                    console.log(`429: requeue and not updated`);
                    await sendSteamMessageToSqs(
                        process.env.AWS_SQS_STEAM_USER_INFO_URL,
                        [steamUser],
                    );
                } else {
                    console.log('api error:', e);
                }
                return {
                    hasError: true,
                    ...steamUser,
                    isPrivate: true,
                    steamTimeStart: 0,
                };
            }
        }),
    );

    const steamUsersData = steamUsersInfo.flatMap((steamUserInfo) => {
        return !steamUserInfo.hasError
            ? {
                  accountId: steamUserInfo.accountId,
                  steamId: steamUserInfo.steamId,
                  steamVisibility: !steamUserInfo.isPrivate,
                  ...(steamUserInfo.steamTimeStart
                      ? {
                            steamTimeStart: new Date(
                                steamUserInfo.steamTimeStart * 1000,
                            ).toISOString(),
                        }
                      : {}),
              }
            : [];
    });

    const steamUsersGameData = steamUsersInfo
        .filter((steamUserInfo) => {
            return (
                Array.isArray(steamUserInfo.games) &&
                steamUserInfo.games.length > 0 &&
                !steamUserInfo.hasError
            );
        })
        .flatMap((steamUserInfo) => {
            return steamUserInfo.games.map((game) => ({
                steamId: steamUserInfo.steamId,
                appid: game.appid,
                game_name: game.name,
                playtime2weeks: !isNaN(Number(game.playtime_2weeks))
                    ? Number(game.playtime_2weeks)
                    : null,
                playtimeForever: !isNaN(Number(game.playtime_forever))
                    ? Number(game.playtime_forever)
                    : null,
            }));
        });

    const steamUsersDataQuery = `INSERT INTO account_steam_info (id, account_id, steam_id, steam_visibility, steam_time_start)
    VALUES ${steamUsersData
        .map(
            (steamUserData) =>
                `(uuid_generate_v4(), '${steamUserData.accountId}', '${
                    steamUserData.steamId
                }', ${steamUserData.steamVisibility}, ${
                    steamUserData.steamTimeStart
                        ? `'${steamUserData.steamTimeStart}'`
                        : null
                })`,
        )
        .join(
            ', ',
        )} ON CONFLICT (account_id) DO UPDATE SET steam_id = EXCLUDED.steam_id, steam_visibility = EXCLUDED.steam_visibility, steam_time_start = CASE WHEN EXCLUDED.steam_time_start IS NOT NULL THEN EXCLUDED.steam_time_start ELSE account_steam_info.steam_time_start END
      `;
    if (Array.isArray(steamUsersData) && steamUsersData.length > 0) {
        const client = await pool.connect();
        await client.query(steamUsersDataQuery);
        client.release();
    }

    const steamUsersGameDataQuery = `INSERT INTO account_steam_owned_games (id, steam_id, appid, game_name, playtime_2weeks, playtime_forever)
    VALUES ${steamUsersGameData
        .map(
            (steamUserGameData) =>
                `(uuid_generate_v4(), '${steamUserGameData.steamId}', '${
                    steamUserGameData.appid
                }', '${steamUserGameData.game_name.replace(/'/g, "''")}', ${
                    steamUserGameData.playtime2weeks
                        ? `${steamUserGameData.playtime2weeks}`
                        : null
                }, ${
                    steamUserGameData.playtimeForever
                        ? `${steamUserGameData.playtimeForever}`
                        : null
                })`,
        )
        .join(
            ', ',
        )} ON CONFLICT (steam_id, appid) DO UPDATE SET playtime_2weeks = EXCLUDED.playtime_2weeks, playtime_forever = EXCLUDED.playtime_forever
      `;
    if (Array.isArray(steamUsersGameData) && steamUsersGameData.length > 0) {
        const client = await pool.connect();
        await client.query(steamUsersGameDataQuery);
        client.release();
    }
    await deleteMessageFromSqs(
        process.env.AWS_SQS_STEAM_USER_INFO_URL,
        receiptHandle,
    );
    console.log('Finished!');
}

async function getSteamUserInfo(steamId) {
    await awaitFor429(500);
    const summary = await getSteamPlayerSummaries(steamId);
    console.log(`Finish getting summary: ${steamId}`);

    if (summary.isPrivate) {
        return summary;
    } else {
        await awaitFor429(500);
        console.log(`Start to get owned games: ${steamId}`);
        const ownedGames = await getSteamOwnedGames(steamId);
        const games = ownedGames.games ?? [];
        const uniqRequestGames = games.filter((c, index) => {
            return games.indexOf(c) === index;
        }); //remove duplicate games
        //sync games detail
        console.log(games);
        if (Array.isArray(uniqRequestGames) && uniqRequestGames.length > 0) {
            syncSteamGameInfo(uniqRequestGames);
        }

        return {
            ...summary,
            games: uniqRequestGames,
            gameCount: ownedGames?.gameCount,
        };
    }
}

async function syncSteamGameInfo(games) {
    let _games;
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT appid FROM steam_game_info WHERE appid IN (${games
                .map(({ appid }) => `'${appid}'`)
                .join(',')})`,
        );
        _games = result.rows.map(({ appid }) => appid);
    } catch (error) {
        console.error('Error executing query:', error.message || error);
    } finally {
        client.release();
    }
    const needRequestGames = [];
    for (let i = 0; i < games.length; i++) {
        if (!_games.includes(games[i].appid.toString())) {
            // console.log(`Push game appid: ${games[i].appid}`);
            needRequestGames.push(games[i]);
        }
        // else {
        //     console.log(
        //         `game appid: ${games[i].appid} has already in database`,
        //     );
        // }
    }
    if (needRequestGames.length > 0) {
        await sendSteamMessageToSqs(
            process.env.AWS_SQS_STEAM_GAME_INFO_URL,
            needRequestGames,
        );
    }
}

async function getSteamPlayerSummaries(steamId) {
    const rawResult = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`,
    );
    if (rawResult.status === 429) {
        throw '429';
    }
    const result = await rawResult.json();
    const timeCreated = result.response?.players[0]?.timecreated;
    const idError = !result.response?.players[0]?.steamid;
    if (idError) {
        return {
            isPrivate: true,
        };
    }
    return {
        isPrivate: !timeCreated,
        ...(timeCreated ? { steamTimeStart: timeCreated } : {}),
    };
}

async function getSteamOwnedGames(steamId) {
    const rawResult = await fetch(
        `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&skip_unvetted_apps=0&format=json`,
    );
    if (rawResult.status === 429) {
        throw '429';
    }
    const result = await rawResult.json();
    const gameCount = result?.response?.game_count;
    return {
        ...(!isNaN(gameCount)
            ? {
                  gameCount,
                  games: result?.response?.games ?? [],
              }
            : {}),
    };
}

async function sendSteamMessageToSqs(QueueUrl, payload) {
    try {
        await sqs.send(
            new AWS.SendMessageCommand({
                MessageBody: JSON.stringify(payload),
                QueueUrl,
                MessageGroupId: 'steam',
                MessageDeduplicationId: `${new Date().getTime()}`,
            }),
        );
    } catch (e) {
        console.error(e);
    }
    return;
}

async function deleteMessageFromSqs(QueueUrl, ReceiptHandle) {
    try {
        await sqs.send(
            new AWS.DeleteMessageCommand({
                QueueUrl,
                ReceiptHandle,
            }),
        );
    } catch (e) {
        console.error(e);
    }
    return;
}

async function awaitFor429(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, Number(ms));
    });
}
