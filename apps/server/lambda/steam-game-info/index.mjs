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
    const games = JSON.parse(event.Records[0].body);
    const receiptHandle = event.Records[0].receiptHandle;
    // let _games;
    // const client = await pool.connect();
    // try {
    //     const result = await client.query(
    //         `SELECT appid FROM steam_game_info WHERE appid IN (${games
    //             .map(({ appid }) => `'${appid}'`)
    //             .join(',')})`,
    //     );
    //     _games = result.rows.map(({ appid }) => appid);
    // } catch (error) {
    //     console.error('Error executing query:', error.message || error);
    // } finally {
    //     client.release();
    // }
    for (let i = 0; i < games.length; i++) {
        // if (!_games.includes(games[i]?.appid?.toString())) {
        console.log(`Request game appid: ${games[i].appid}`);
        await awaitFor429(1500);
        // if (i !== 0) {
        //     await awaitFor429(process.env.AWAIT_TIME_MS ?? 2000);
        // }
        await updateSteamGameInfoFromQueue(games[i].appid);
        // } else {
        //     console.log(
        //         `game appid: ${games[i].appid} has already in database`,
        //     );
        // }
    }
    await deleteMessageFromSqs(
        process.env.AWS_SQS_STEAM_GAME_INFO_URL,
        receiptHandle,
    );
    console.log('Finished!');
    const response = {
        statusCode: 200,
        body: JSON.stringify({ status: 'success' }),
    };
    return response;
};

async function awaitFor429(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, Number(ms));
    });
}

async function updateSteamGameInfoFromQueue(appid) {
    try {
        const rawResult = await fetch(
            `https://store.steampowered.com/api/appdetails?appids=${appid}`,
        );
        const result = await rawResult.json();
        if (!result || !result[appid]?.data) {
            const client = await pool.connect();
            const insertGameQuery = `INSERT INTO steam_game_info 
(id, game_name, appid, header_image, short_description, platforms, genres, categories, is_free, website) 
VALUES (uuid_generate_v4(), '', '${appid.toString()}', '', '', '{}', '{}', '{}', true, '') 
ON CONFLICT (appid) DO UPDATE SET game_name = EXCLUDED.game_name, header_image = EXCLUDED.header_image, short_description = EXCLUDED.short_description, 
platforms = EXCLUDED.platforms, genres = EXCLUDED.genres, categories = EXCLUDED.categories, is_free = EXCLUDED.is_free, website = EXCLUDED.website`;
            await client.query(insertGameQuery);
            client.release();
            console.log(`no game info: ${appid}`);
            return;
        }

        const appInfo = result[appid]?.data;
        const is_free = appInfo?.is_free || !appInfo?.price_overview;

        const platforms = Object.entries(appInfo.platforms).flatMap(
            ([key, value]) => {
                return value ? key : [];
            },
        );
        const categories = Array.isArray(appInfo.categories)
            ? appInfo.categories.map((category) => category.description)
            : [];
        const genres = Array.isArray(appInfo.genres)
            ? appInfo.genres.map((genre) => genre.description)
            : [];
        const escapeText = (text) => {
            return text.replace(/'/g, "''");
        };
        const client = await pool.connect();
        const insertGameQuery = `INSERT INTO steam_game_info 
(id, game_name, appid, header_image, short_description, platforms, genres, categories, is_free, website) 
VALUES (uuid_generate_v4(), '${escapeText(
            appInfo.name,
        )}', '${appid.toString()}', '${appInfo.header_image}', '${escapeText(
            appInfo.short_description,
        )}', '{${platforms.join(',')}}', '{${genres.join(
            ',',
        )}}', '{${categories.join(',')}}', ${is_free}, '${appInfo.website}') 
ON CONFLICT (appid) DO UPDATE SET game_name = EXCLUDED.game_name, header_image = EXCLUDED.header_image, short_description = EXCLUDED.short_description, 
platforms = EXCLUDED.platforms, genres = EXCLUDED.genres, categories = EXCLUDED.categories, is_free = EXCLUDED.is_free, website = EXCLUDED.website`;
        await client.query(insertGameQuery);
        client.release();
    } catch (e) {
        //maybe 429
        //reRequest
        if (/429/.test(e)) {
            console.log(`re-queue: ${appid}`);
            await sendSteamMessageToSqs(
                process.env.AWS_SQS_STEAM_GAME_INFO_URL,
                [{ appid }],
            );
        } else {
            console.error(e);
        }
    }

    return;
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
