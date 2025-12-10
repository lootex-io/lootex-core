const { Sequelize } = require('sequelize');
const XLSX = require('xlsx');
const { scoreCollection } = require('./lib/openrarityjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../configs/.env') });

async function main() {
  // 1. 建立資料庫連接
  const sequelize = new Sequelize(process.env.POSTGRES_DATABASE, process.env.POSTGRES_USERNAME, process.env.POSTGRES_PASSWORD, {
    host: process.env.POSTGRES_HOST,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 20,         // 最大連接數
      min: 0,          // 最小連接數
      acquire: 60000,  // 獲取連接的超時時間（毫秒）
      idle: 10000      // 連接空閒時間（毫秒）
    }
  });

  try {
    // 2. 從命令行獲取 slug
    const slug = process.argv[2];
    if (!slug) {
      throw new Error('Please provide a slug as argument');
    }

    // 3. 執行查詢
    console.time('[Query assets]');
    const query = `
      SELECT 
        asset_extra.asset_id as id,
        asset.token_id::text as token_id,
        asset.traits::text as traits
      FROM asset_extra
      LEFT JOIN asset ON asset_extra.asset_id = asset.id
      LEFT JOIN collections ON asset_extra.collection_id = collections.id
      WHERE collections.slug = :slug
    `;

    const [queryResults] = await sequelize.query(query, {
      replacements: { slug },
      raw: true,
    });
    console.timeEnd('[Query assets]');

    // 直接使用查詢結果
    const tokens = queryResults.map((row, index) => {
      let traits = [];
      
      // 解析 traits JSON 字符串
      if (row.traits) {
        try {
          // 確保解析字符串形式的 traits
          const parsedTraits = JSON.parse(row.traits);
          traits = parsedTraits.map(trait => ({
            type: String(trait.trait_type),
            value: String(trait.value)
          }));
        } catch (e) {
          console.error(`Error parsing traits for token ${row.token_id}:`, e);
          console.error('Problem traits:', row.traits);
          return null;
        }
      }

      return {
        id: String(row.id),
        tokenID: String(row.token_id),
        traits: traits
      };
    }).filter(token => token !== null);

    // 7. 計算稀有度
    console.log('Calculating rarity scores for', tokens.length, 'tokens');
    const scores = scoreCollection(tokens);
    
    if (!scores || scores.length === 0) {
      throw new Error('No scores returned from scoreCollection');
    }

    // 批量更新資料庫中的稀有度排名
    console.time('[Update rarity rankings]');
    const updateValues = scores.map(score => {
      const token = tokens.find(t => t.tokenID === score.tokenID);
      if (!token) return null;
      return `(${score.rank}, '${token.id}')`;
    }).filter(Boolean);

    if (updateValues.length > 0) {
      const batchUpdateQuery = `
        UPDATE asset_extra AS ae
        SET rarity_ranking = v.rank
        FROM (VALUES ${updateValues.join(',')}) AS v(rank, asset_id)
        WHERE ae.asset_id = v.asset_id::uuid
      `;

      try {
        await sequelize.query(batchUpdateQuery);
        console.timeEnd('[Update rarity rankings]');

        // 更新 Collection 的 is_rarity 欄位
        const updateCollectionQuery = `
          UPDATE collections
          SET is_rarity = true
          WHERE slug = :slug
        `;

        await sequelize.query(updateCollectionQuery, {
          replacements: { slug },
          type: 'UPDATE'
        });

        console.log(`Successfully updated is_rarity for collection ${slug}`);
      } catch (error) {
        console.error('Error updating database:', error);
      }
    }

    console.log('Successfully calculated scores for', scores.length, 'tokens');

    // 8. 計算特徵統計
    const traitStats = {};
    const totalTokens = tokens.length;

    tokens.forEach(token => {
      token.traits.forEach(trait => {
        const { type, value } = trait;
        if (!traitStats[type]) {
          traitStats[type] = {};
        }
        if (!traitStats[type][value]) {
          traitStats[type][value] = {
            count: 0,
            percentage: 0,
            rarity_score: 0
          };
        }
        traitStats[type][value].count++;
      });
    });

    // 9. 計算特徵稀有度
    console.time('[Update trait percentages]');
    const chunks = [];
    const chunkSize = 50; // 每批次處理的數量
    
    // 將所有更新請求分組
    Object.keys(traitStats).forEach(type => {
      Object.keys(traitStats[type]).forEach(value => {
        const stats = traitStats[type][value];
        const percentageValue = Number(((stats.count / totalTokens) * 100).toFixed(2));
        stats.percentage = percentageValue;
        stats.rarity_score = 1 / (stats.count / totalTokens);

        chunks.push({
          percentage: percentageValue,
          trait_type: type,
          trait_value: value
        });
      });
    });

    // 分批處理更新
    for (let i = 0; i < chunks.length; i += chunkSize) {
      const batch = chunks.slice(i, i + chunkSize);
      const updatePromises = batch.map(item => {
        const updateTraitQuery = `
          UPDATE asset_traits
          SET rarity_percent = :percentage
          WHERE id IN (
            SELECT asset_traits.id
            FROM asset_traits
            LEFT JOIN collections ON asset_traits.collection_id = collections.id
            WHERE collections.slug = :slug
              AND trait_type = :trait_type
              AND value = :trait_value
          )
        `;

        return sequelize.query(updateTraitQuery, {
          replacements: { 
            percentage: item.percentage,
            slug,
            trait_type: item.trait_type,
            trait_value: item.trait_value
          },
          type: 'UPDATE'
        });
      });

      try {
        await Promise.all(updatePromises);
        console.log(`Processed batch ${i/chunkSize + 1}/${Math.ceil(chunks.length/chunkSize)}`);
      } catch (error) {
        console.error('Error updating trait batch:', error);
        throw error;
      }
    }
    console.timeEnd('[Update trait percentages]');

    // 10. 生成特徵稀有度報告
    const traitRows = [];
    Object.keys(traitStats).forEach(type => {
      Object.keys(traitStats[type]).forEach(value => {
        const stats = traitStats[type][value];
        traitRows.push({
          trait_type: type,
          trait_value: value,
          count: stats.count,
          percentage: stats.percentage.toFixed(2) + '%',
          rarity_score: stats.rarity_score.toString()
        });
      });
    });

    // 11. 生成最終結果
    const results = queryResults.map((item, index) => {
      const tokenId = item.token_id || (index + 1).toString();
      const score = scores.find(s => s.tokenID === tokenId);
      
      if (!score) {
        console.warn(`No score found for token ${tokenId}`);
      }
      
      const { traits, ...itemWithoutTraits } = item;
      return {
        ...itemWithoutTraits,
        rarity_score: score ? score.score.toString() : '0',
        rarity_rank: score ? score.rank : 0
      };
    });

    // 12. 保存結果
    // 特徵稀有度報告
    const traitWorkbook = XLSX.utils.book_new();
    const traitWorksheet = XLSX.utils.json_to_sheet(traitRows.sort((a, b) => 
      parseFloat(b.rarity_score) - parseFloat(a.rarity_score)
    ));

    // 設置列寬
    const traitColWidths = [
      { wch: 20 },  // trait_type
      { wch: 30 },  // trait_value
      { wch: 10 },  // count
      { wch: 12 },  // percentage
      { wch: 15 }   // rarity_score
    ];
    traitWorksheet['!cols'] = traitColWidths;

    XLSX.utils.book_append_sheet(traitWorkbook, traitWorksheet, "Trait Rarity");
    const traitFileName = `${slug.replace(/[/:]/g, '_')}_trait_rarity.xlsx`;
    XLSX.writeFile(traitWorkbook, traitFileName);
    console.log(`Trait rarity saved to ${traitFileName}`);

    // 最終結果報告
    const finalResults = results.map(item => ({
      token_id: item.token_id,
      rarity_score: item.rarity_score,
      rarity_rank: item.rarity_rank,
      traits: JSON.stringify(item.traits || [])
    }));

    const finalWorkbook = XLSX.utils.book_new();
    const finalWorksheet = XLSX.utils.json_to_sheet(finalResults.sort((a, b) => 
      parseFloat(b.rarity_score) - parseFloat(a.rarity_score)
    ));

    // 設置列寬
    const finalColWidths = [
      { wch: 10 },  // token_id
      { wch: 15 },  // rarity_score
      { wch: 10 },  // rarity_rank
      { wch: 100 }  // traits
    ];
    finalWorksheet['!cols'] = finalColWidths;

    XLSX.utils.book_append_sheet(finalWorkbook, finalWorksheet, "Rarity Results");
    const finalFileName = `${slug.replace(/[/:]/g, '_')}_rarity_results.xlsx`;
    XLSX.writeFile(finalWorkbook, finalFileName);
    console.log(`Rarity results saved to ${finalFileName}`);

    // 更新 asset_traits 的 total_count
    console.time('[Update asset_traits total_count]');
    const updateTraitsTotalCountQuery = `
      WITH traits_count AS (
        SELECT
          asset_traits.trait_type,
          asset_traits.value,
          COUNT(*) AS count
        FROM asset_traits
        LEFT JOIN collections ON asset_traits.collection_id = collections.id
        WHERE collections.slug = :slug
        GROUP BY asset_traits.trait_type, asset_traits.value
      ), collection_id AS (
        SELECT id FROM collections WHERE slug = :slug
      )
      UPDATE asset_traits
      SET total_count = traits_count.count
      FROM traits_count
      WHERE
        asset_traits.collection_id = (SELECT id FROM collection_id)
        AND asset_traits.trait_type = traits_count.trait_type
        AND asset_traits.value = traits_count.value
    `;

    await sequelize.query(updateTraitsTotalCountQuery, {
      replacements: { slug },
      type: 'UPDATE'
    });
    console.timeEnd('[Update asset_traits total_count]');

    console.log(`Rarity calculation completed! Results saved for ${slug}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

main(); 