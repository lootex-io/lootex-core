import { Client } from 'pg';
import * as dotenv from 'dotenv';

import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../configs/.env') });

async function backfill() {
    const client = new Client({
        host: process.env.POSTGRES_HOST || 'lootex-dex-dev-instance-1.cszc7yob6hst.us-east-1.rds.amazonaws.com',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        user: process.env.POSTGRES_USERNAME || 'lootex',
        password: process.env.POSTGRES_PASSWORD || 'Lootex2023#',
        database: process.env.POSTGRES_DATABASE || 'dex-mainnet',
        ssl: false,
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Parse arguments for sharding
        // Usage: npx ts-node scripts/backfill-contract-id.ts [startHex] [endHex]
        // Example: npx ts-node scripts/backfill-contract-id.ts 0 4  (Process 0... to 3...)
        const args = process.argv.slice(2);
        const startHex = (args[0] || '0').toLowerCase();
        const endHex = (args[1] || '').toLowerCase();

        // Construct UUID ranges
        const startUuid = startHex.padEnd(8, '0') + '-0000-0000-0000-000000000000';
        let endUuid: string | null = null;

        // Only set endUuid if endHex is a valid hex string (0-9, a-f)
        if (endHex && /^[0-9a-f]+$/.test(endHex)) {
            endUuid = endHex.padEnd(8, '0') + '-0000-0000-0000-000000000000';
        }

        console.log(`Processing range: [${startHex}, ${endHex || 'end'})`);
        console.log(`UUID Range: > ${startUuid} ${endUuid ? '< ' + endUuid : ''}`);

        let totalUpdated = 0;
        const batchSize = 5000;
        let lastId = startUuid;

        while (true) {
            // 1. Fetch batch of rows needing update
            let findRowsQuery = `
        SELECT id, asset_id 
        FROM asset_as_eth_account 
        WHERE id > $1 AND contract_id IS NULL
      `;

            const queryParams: any[] = [lastId, batchSize];

            if (endUuid) {
                findRowsQuery += ` AND id < $3`;
                queryParams.push(endUuid);
            }

            findRowsQuery += `
        ORDER BY id ASC 
        LIMIT $2
      `;

            const rowsRes = await client.query(findRowsQuery, queryParams);

            if (rowsRes.rowCount === 0) {
                console.log(`Backfill complete for range [${startHex}, ${endHex})!`);
                break;
            }

            const rows = rowsRes.rows;
            lastId = rows[rows.length - 1].id; // Update cursor

            const assetIds = [...new Set(rows.map(r => r.asset_id))];

            // 2. Fetch contract_ids from asset table
            const assetsQuery = `
        SELECT id, contract_id 
        FROM asset 
        WHERE id = ANY($1::uuid[])
      `;

            const assetsRes = await client.query(assetsQuery, [assetIds]);
            const assetMap = new Map();
            assetsRes.rows.forEach(r => {
                assetMap.set(r.id, r.contract_id);
            });

            // 3. Prepare values for bulk update
            const updateValues = rows
                .map(r => {
                    const contractId = assetMap.get(r.asset_id);
                    return contractId ? `('${r.id}'::uuid, '${contractId}'::uuid)` : null;
                })
                .filter(v => v !== null);

            if (updateValues.length === 0) {
                console.log(`Batch ending at ${lastId} had no valid updates.`);
                continue;
            }

            // 4. Perform Bulk Update using VALUES
            const updateQuery = `
        UPDATE asset_as_eth_account as t
        SET contract_id = v.contract_id
        FROM (VALUES ${updateValues.join(',')}) as v(id, contract_id)
        WHERE t.id = v.id
      `;

            const start = Date.now();
            const updateRes = await client.query(updateQuery);
            const duration = Date.now() - start;

            totalUpdated += updateRes.rowCount;
            console.log(`[${startHex}-${endHex}] Processed batch ending at ${lastId}. Updated ${updateRes.rowCount} rows in ${duration}ms. Total: ${totalUpdated}`);
        }
    } catch (err) {
        console.error('Error executing backfill:', err);
    } finally {
        await client.end();
    }
}

backfill();
