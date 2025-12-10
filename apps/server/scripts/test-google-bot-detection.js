#!/usr/bin/env node

/**
 * Google Bot 檢測測試腳本
 * 用於測試 Google Bot 檢測功能是否正常工作
 */

const testUserAgents = [
  // Google Bot 變體
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Googlebot-Image/1.0',
  'Googlebot-News/1.0',
  'Googlebot-Video/1.0',
  'Googlebot-Desktop/1.0',
  'Googlebot-Mobile/1.0',
  
  // 其他搜索引擎爬蟲
  'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  'Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)',
  'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)',
  'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
  'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
  
  // 正常用戶代理
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
];

function isGoogleBot(userAgent) {
  if (!userAgent) return false;

  const googleBotPatterns = [
    /Googlebot/i,
    /Googlebot-Image/i,
    /Googlebot-News/i,
    /Googlebot-Video/i,
    /Googlebot-Desktop/i,
    /Googlebot-Mobile/i,
    /Google-Site-Verification/i,
    /Google-Structured-Data-Testing-Tool/i,
  ];

  return googleBotPatterns.some(pattern => pattern.test(userAgent));
}

function isAnyBot(userAgent) {
  if (!userAgent) return false;

  const botPatterns = [
    /Googlebot/i,
    /Googlebot-Image/i,
    /Googlebot-News/i,
    /Googlebot-Video/i,
    /Googlebot-Desktop/i,
    /Googlebot-Mobile/i,
    /Google-Site-Verification/i,
    /Google-Structured-Data-Testing-Tool/i,
    /Bingbot/i,
    /Slurp/i,
    /DuckDuckBot/i,
    /Baiduspider/i,
    /YandexBot/i,
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}

function getBotType(userAgent) {
  if (!userAgent) return null;

  const botPatterns = [
    { pattern: /Googlebot/i, type: 'Google Bot' },
    { pattern: /Googlebot-Image/i, type: 'Google Bot Image' },
    { pattern: /Googlebot-News/i, type: 'Google Bot News' },
    { pattern: /Googlebot-Video/i, type: 'Google Bot Video' },
    { pattern: /Googlebot-Desktop/i, type: 'Google Bot Desktop' },
    { pattern: /Googlebot-Mobile/i, type: 'Google Bot Mobile' },
    { pattern: /Bingbot/i, type: 'Bing Bot' },
    { pattern: /Slurp/i, type: 'Yahoo Bot' },
    { pattern: /DuckDuckBot/i, type: 'DuckDuckGo Bot' },
    { pattern: /Baiduspider/i, type: 'Baidu Bot' },
    { pattern: /YandexBot/i, type: 'Yandex Bot' },
  ];

  for (const { pattern, type } of botPatterns) {
    if (pattern.test(userAgent)) {
      return type;
    }
  }

  return null;
}

console.log('🤖 Google Bot 檢測測試\n');

testUserAgents.forEach((userAgent, index) => {
  const isGoogle = isGoogleBot(userAgent);
  const isAny = isAnyBot(userAgent);
  const botType = getBotType(userAgent);
  
  console.log(`測試 ${index + 1}:`);
  console.log(`User Agent: ${userAgent}`);
  console.log(`Google Bot: ${isGoogle ? '✅' : '❌'}`);
  console.log(`Any Bot: ${isAny ? '✅' : '❌'}`);
  console.log(`Bot Type: ${botType || 'Normal User'}`);
  console.log(`Should Skip Sync: ${isGoogle ? '✅' : '❌'}`);
  console.log('---');
});

console.log('\n📊 測試總結:');
const googleBots = testUserAgents.filter(ua => isGoogleBot(ua));
const anyBots = testUserAgents.filter(ua => isAnyBot(ua));
const normalUsers = testUserAgents.filter(ua => !isAnyBot(ua));

console.log(`Google Bots: ${googleBots.length}`);
console.log(`Any Bots: ${anyBots.length}`);
console.log(`Normal Users: ${normalUsers.length}`);

console.log('\n✅ Google Bot 檢測功能測試完成！');
