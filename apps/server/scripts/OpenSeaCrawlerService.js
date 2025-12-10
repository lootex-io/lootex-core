require('dotenv').config({ path: './.env' });
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const { Client } = require('pg');
const axios = require('axios');
const xlsx = require('xlsx');

class OpenSeaCrawlerService {
  constructor() {
    this.client = new Client({
      host: process.env.POSTGRES_HOST,
      user: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DATABASE,
    });
    this.inputs = [
      'base',
      'ethereum',
      'matic',
      'arbitrum'
    ];
    this.maxRetries = 3;
    this.whitelist = [];
    this.SPREADSHEET_ID = '1rqnhHcj278TOIiv_2Jt7NCdXfPz7xLMtw-jM9AhgQTY';
    this.RANGE = 'Sheet1!B:C';
  }

  async _initializeWhitelist() {
    const url = "https://docs.google.com/spreadsheets/d/1rqnhHcj278TOIiv_2Jt7NCdXfPz7xLMtw-jM9AhgQTY/export?format=xlsx";

    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const workbook = xlsx.read(response.data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { header: 'A' });

      // 检查 A、B、C 列是否都有值，只有都有值时才添加 C 列的值到白名单
      const whitelist = data
        .filter(row =>
          row['B'] === true &&
          row['C'] && typeof row['C'] === 'string' && row['C'].trim() !== ''
        )
        .map(row => row['C']);

      console.log('白名单初始化成功！总共有 ' + whitelist.length + ' 个有效项');
      return whitelist;
    } catch (error) {
      console.error('初始化白名单时出错：', error.message);
      return [];
    }
  }

  async initializeWhitelist() {
    try {
      const whitelist = await this._initializeWhitelist();
      this.whitelist = whitelist;
      console.log('Whitelist initialized:', this.whitelist);
    } catch (error) {
      console.error('Error initializing whitelist:', error);
    }
  }

  async getRanks(option = { limit: 100 }) {
    const { limit } = option;

    await this.initializeWhitelist();

    puppeteer.use(StealthPlugin());
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/usr/bin/chromium-browser',
      // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    const collections = new Set(this.whitelist); // 初始化集合时包含白名单

    const results = this.whitelist.map(slug => ({ input: 'whitelist', slug })); // 白名单加入结果集

    try {
      await page.setViewport({ width: 1920, height: 4000 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      );

      let remainingInputs = [...this.inputs];
      for (let retries = 0; retries < this.maxRetries && remainingInputs.length > 0; retries++) {
        const failedInputs = [];

        for (const input of remainingInputs) {
          try {
            const url = `https://opensea.io/stats?chains=${input}&timeframe=thirty_days`;
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // 增加超时时间到 60000 ms
            console.log("Start Fetch ", url);

            const initialLinks = await page.$$eval('a', (as) => as.map((a) => a.getAttribute('href')));
            console.log("Initial links length", initialLinks.length);
            console.log("Initial links:", initialLinks);

            let collectionCount = 0;

            for (const link of initialLinks) {
              if (link && link.startsWith('/collection/')) {
                const slug = link.substring(link.lastIndexOf('/') + 1);
                console.log("slug", slug);
                collections.add(slug);
                collectionCount++;
                results.push({ input, slug });
              }
              if (collectionCount >= limit) {
                break;
              }
            }
            // 滚动页面以加载更多内容
            let previousHeight = await page.evaluate('document.body.scrollHeight');
            let count = 0;
            while (count < 15) {  // 尝试滚动 15 次
              await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight);
              });
              await new Promise(resolve => setTimeout(resolve, 3000));  // 等待加载
              let newHeight = await page.evaluate('document.body.scrollHeight');
              if (newHeight === previousHeight) {
                break;  // 如果页面高度未改变，停止滚动
              }
              previousHeight = newHeight;
              count += 1;
            }

            const links = await page.$$eval('a', (as) => as.map((a) => a.getAttribute('href')));
            console.log("links length", links.length);
            console.log("All links:", links);
            for (const link of links) {
              if (link && link.startsWith('/collection/')) {
                const slug = link.substring(link.lastIndexOf('/') + 1);
                console.log("slug", slug);
                collections.add(slug);
                collectionCount++;
                results.push({ input, slug });
              }
              if (collectionCount >= limit) {
                break;
              }
            }
          } catch (error) {
            failedInputs.push(input);
          }
        }

        remainingInputs = failedInputs;
        if (remainingInputs.length > 0) {
          await page.waitForTimeout(5000); // 等待5秒钟后重试
        }
      }

      await browser.close();

      // 同步数据库并生成 Excel 文件
    } catch (error) {
      console.error('Unexpected error during operation:', error);
    }

    // 获取数据库中的 slugs 并执行比对和更新操作
    await this.syncWithDatabase(Array.from(collections));
  }

  async syncWithDatabase(topCollectionsSlugs) {
    console.log("topCollectionsSlugs", topCollectionsSlugs.length);
    await this.client.connect();

    try {
      const res = await this.client.query('SELECT slug, deleted FROM aggregator_opensea_watched_collection');
      const dbSlugs = res.rows.map(row => ({ slug: row.slug, deleted: row.deleted }));
      const allSlugs = Array.from(new Set([...topCollectionsSlugs, ...this.whitelist]));

      // 1. topCollectionsSlugs 里存在，但 dbSlugs 里不存在的 --> 新增的
      const slugsToAdd = topCollectionsSlugs.filter(slug => !dbSlugs.some(dbSlug => dbSlug.slug === slug));

      // 2. topCollectionsSlugs 里存在，且 dbSlugs 里也存在，且 deleted = false --> 不变的
      const unchanged = dbSlugs
        .filter(dbSlug => topCollectionsSlugs.includes(dbSlug.slug) && dbSlug.deleted === false)
        .map(dbSlug => dbSlug.slug);


      // 3. topCollectionsSlugs 里不存在，但 dbSlugs 里存在的 --> 移除的
      const slugsToRemove = dbSlugs
        .filter(dbSlug => !topCollectionsSlugs.includes(dbSlug.slug))
        .map(dbSlug => dbSlug.slug);

      // 4. topCollectionsSlugs 里存在，但 dbSlugs 里也存在，且 deleted = false --> 重新激活的
      const slugsToUpdate = dbSlugs
        .filter(dbSlug => topCollectionsSlugs.includes(dbSlug.slug) && dbSlug.deleted === true)
        .map(dbSlug => dbSlug.slug);


      // 写入数据库的代码
      for (const slug of slugsToAdd) {
        await this.client.query(
          'INSERT INTO aggregator_opensea_watched_collection (slug, deleted) VALUES ($1, false)',
          [slug]
        );
        console.log(`Added slug to DB: ${slug}`);
      }

      // 设置 deleted = false 来激活 slug
      for (const slug of slugsToUpdate) {
        await this.client.query(
          'UPDATE aggregator_opensea_watched_collection SET deleted = false WHERE slug = $1',
          [slug]
        );
        console.log(`Updated slug to active in DB: ${slug}`);
      }

      // 设置 deleted = true 来移除 slug
      for (const slug of slugsToRemove) {
        await this.client.query(
          'UPDATE aggregator_opensea_watched_collection SET deleted = true WHERE slug = $1',
          [slug]
        );
        console.log(`Marked slug as deleted in DB: ${slug}`);
      }

      console.log(`Unchanged in DB: ${unchanged.length}`);
      console.log(`slugsToAdd in DB: ${slugsToAdd.length}`);
      console.log(`slugsToRemove in DB: ${slugsToRemove.length}`);
      console.log(`slugsToUpdate (reactivated) in DB: ${slugsToUpdate.length}`);

      // 生成 Excel 文件
      const workbook = xlsx.utils.book_new();
      const worksheetData = [
        ['WhiteList', 'UnChanged', 'New', 'Removed', 'Reactivated'],
        ...this.formatDataForExcel(this.whitelist, unchanged, slugsToAdd, slugsToRemove, slugsToUpdate)
      ];

      const worksheet = xlsx.utils.aoa_to_sheet(worksheetData);
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Collections');
      xlsx.writeFile(workbook, 'collections.xlsx');
      console.log('Excel file was written successfully');

    } catch (error) {
      console.error('Error during database sync:', error);
    } finally {
      await this.client.end();
    }
  }

  formatDataForExcel(whitelist, unchanged, slugsToAdd, slugsToRemove, reactivatedSlugs) {
    const maxLength = Math.max(
      whitelist.length,
      unchanged.length,
      slugsToAdd.length,
      slugsToRemove.length,
      reactivatedSlugs.length // 计算最大长度以确保每列都对齐
    );

    const rows = [];
    for (let i = 0; i < maxLength; i++) {
      rows.push([
        whitelist[i] || '',          // 白名单
        unchanged[i] || '',          // 没有变动的 slug
        slugsToAdd[i] || '',         // 新增的 slug
        slugsToRemove[i] || '',      // 移除的 slug
        reactivatedSlugs[i] || ''    // 被重新激活的 slug
      ]);
    }

    return rows;
  }
}

module.exports = OpenSeaCrawlerService;