import { Injectable, Logger } from '@nestjs/common';

/**
 * 搜索引擎爬蟲檢測服務
 * 用於檢測各種搜索引擎爬蟲並提供相應的處理策略
 */
@Injectable()
export class BotDetectionService {
  private readonly logger = new Logger(BotDetectionService.name);

  /**
   * 檢測是否為搜索引擎爬蟲
   */
  isSearchEngineBot(userAgent: string): boolean {
    if (!userAgent) return false;

    const botPatterns = [
      // Google Bot 系列
      /Googlebot/i,
      /Googlebot-Image/i,
      /Googlebot-News/i,
      /Googlebot-Video/i,
      /Googlebot-Desktop/i,
      /Googlebot-Mobile/i,
      /Google-Site-Verification/i,
      /Google-Structured-Data-Testing-Tool/i,

      // 其他搜索引擎
      /Bingbot/i,
      /Slurp/i, // Yahoo
      /DuckDuckBot/i,
      /Baiduspider/i,
      /YandexBot/i,
      /facebookexternalhit/i,
      /Twitterbot/i,
      /LinkedInBot/i,
    ];

    return botPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * 檢測是否為 Google Bot（僅 Google）
   */
  isGoogleBot(userAgent: string): boolean {
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

    return googleBotPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * 獲取爬蟲類型
   */
  getBotType(userAgent: string): string | null {
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
      { pattern: /facebookexternalhit/i, type: 'Facebook Bot' },
      { pattern: /Twitterbot/i, type: 'Twitter Bot' },
      { pattern: /LinkedInBot/i, type: 'LinkedIn Bot' },
    ];

    for (const { pattern, type } of botPatterns) {
      if (pattern.test(userAgent)) {
        return type;
      }
    }

    return null;
  }

  /**
   * 檢查是否應該跳過數據庫操作
   */
  shouldSkipDatabaseOperations(userAgent: string): boolean {
    return this.isSearchEngineBot(userAgent);
  }

  /**
   * 檢查是否應該跳過同步操作
   */
  shouldSkipSyncOperations(userAgent: string): boolean {
    return this.isSearchEngineBot(userAgent);
  }

  /**
   * 檢查是否應該跳過聚合操作
   */
  shouldSkipAggregatorOperations(userAgent: string): boolean {
    return this.isSearchEngineBot(userAgent);
  }

  /**
   * 獲取適合的緩存時間（秒）
   */
  getCacheTimeForBot(userAgent: string): number {
    if (this.isGoogleBot(userAgent)) {
      return 3600; // Google Bot: 1小時
    }

    if (this.isSearchEngineBot(userAgent)) {
      return 1800; // 其他爬蟲: 30分鐘
    }

    return 300; // 正常用戶: 5分鐘
  }

  /**
   * 獲取跳過操作的響應
   */
  getSkipResponse(userAgent: string, operation: string): any {
    const botType = this.getBotType(userAgent);

    return {
      success: false,
      skipped: true,
      reason: `${botType || 'Search Engine Bot'} detected`,
      message: `Skipping ${operation} to reduce database load`,
      botType: botType,
      cacheTime: this.getCacheTimeForBot(userAgent),
    };
  }

  /**
   * 記錄爬蟲訪問日誌
   */
  logBotAccess(userAgent: string, endpoint: string, action: string = 'access') {
    const botType = this.getBotType(userAgent);
    this.logger.debug(`🤖 ${botType} ${action} ${endpoint} - ${userAgent}`);
  }
}
