// import { Injectable } from '@nestjs/common';
//
// const puppeteer = require('puppeteer-extra')
// // Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
// const StealthPlugin = require('puppeteer-extra-plugin-stealth')
// @Injectable()
// export class OpenSeaCrawlerService {
//   private inputs = [
//     'arbitrum',
//     'avalanche',
//     // 'bsc',
//     'base',
//     // 'blast',
//     'ethereum',
//     'matic',
//     // 'all',
//   ];
//
//   constructor() { }
//   maxRetries = 3; // 最大重试次数
//
//   async getRanks(option = { limit: 10 }) {
//     const { limit } = option;
//     puppeteer.use(StealthPlugin());
//     const launchOptions = {
//       executablePath: '/usr/bin/google-chrome-stable', // 更新为你的 Chrome 安装路径
//       headless: true, // 无头模式
//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--disable-accelerated-2d-canvas',
//         '--disable-gpu',
//         '--window-size=1920x1080',
//         '--start-maximized',
//         '--no-first-run',
//         '--no-zygote',
//         '--disable-infobars',
//         '--disable-features=site-per-process',
//         '--disable-extensions',
//         '--proxy-server="direct://"',
//         '--proxy-bypass-list=*',
//       ],
//       ignoreHTTPSErrors: true,
//     };
//
//     const browser = await puppeteer.launch(launchOptions);
//     // const browser = await puppeteer.launch({ headless: true, ignoreDefaultArgs: ['--disable-extensions'] }); // 设置 headless 为 false
//     // const browser = await puppeteer.launch({
//     //   executablePath: '/usr/bin/google-chrome-stable',
//     //   args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process'],
//     //   headless: true,
//     // });
//     const page = await browser.newPage();
//     const collections = new Set();
//
//     try {
//       await page.setViewport({ width: 1920, height: 4000 });
//       await page.setUserAgent(
//         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
//       );
//       await page.setExtraHTTPHeaders({
//         'accept-language': 'en-US,en;q=0.9',
//         'accept-encoding': 'gzip, deflate, br',
//         'upgrade-insecure-requests': '1',
//       });
//
//       // 启用 JavaScript
//       await page.setJavaScriptEnabled(true);
//
//       // 模拟鼠标移动以避免被检测到为机器人
//       await page.evaluateOnNewDocument(() => {
//         Object.defineProperty(navigator, 'webdriver', { get: () => false });
//       });
//
//       let remainingInputs = [...this.inputs];
//
//       for (let retries = 0; retries < this.maxRetries && remainingInputs.length > 0; retries++) {
//         const failedInputs = [];
//
//         for (const input of remainingInputs) {
//           try {
//             const url =
//               input === 'all'
//                 ? 'https://opensea.io/rankings?sortBy=one_day_volume'
//                 : `https://opensea.io/rankings?sortBy=one_day_volume&chain=${input}`;
//             await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // 增加超时时间到 60000 ms
//             console.log("Start Fetch ", url);
//
//             // 滚动页面以加载更多内容
//             let previousHeight = await page.evaluate('document.body.scrollHeight');
//             let count = 0;
//             let collectionCount = 0;
//             while (count < 3) {  // 尝试滚动3次
//               await page.evaluate(() => {
//                 window.scrollBy(0, window.innerHeight);
//               });
//               await new Promise(resolve => setTimeout(resolve, 3000));  // 等待加载
//               let newHeight = await page.evaluate('document.body.scrollHeight');
//               if (newHeight === previousHeight) {
//                 break;  // 如果页面高度未改变，停止滚动
//               }
//               previousHeight = newHeight;
//               count += 1;
//             }
//
//
//             // 打印页面HTML内容
//             const pageHTML = await page.content();
//             console.log(`HTML content for input ${input}:`, pageHTML);
//
//             const links = await page.$$eval('a', (as) => as.map((a) => a.href));
//             console.log("links length", links.length);
//             for (const link of links) {
//               if (link.startsWith('https://opensea.io/collection/')) {
//                 const slug = link.substring(link.lastIndexOf('/') + 1);
//                 console.log("slug", slug);
//                 collections.add(slug);
//                 collectionCount++;
//               }
//               if (collectionCount >= limit) {
//                 break;
//               }
//             }
//             if (collectionCount >= limit) {
//               break;
//             }
//           } catch (error) {
//             console.error(`Error during page navigation for input ${input}:`, error);
//             failedInputs.push(input); // 记录失败的input
//           }
//         }
//
//         remainingInputs = failedInputs; // 更新为失败的inputs，继续重试
//         if (remainingInputs.length > 0) {
//           console.log(`Retrying for failed inputs: ${remainingInputs.join(', ')}`);
//           await page.waitForTimeout(5000); // 等待5秒钟后重试
//         }
//       }
//
//       if (remainingInputs.length > 0) {
//         console.error(`Failed to fetch data for inputs: ${remainingInputs.join(', ')} after ${this.maxRetries} retries.`);
//       }
//     } catch (error) {
//       console.error('Unexpected error during operation:', error);
//     } finally {
//       await browser.close();
//     }
//     return collections;
//   }
// }
