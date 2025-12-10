import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { BotDetectionService } from '@/common/services/bot-detection.service';

/**
 * 搜索引擎爬蟲檢測中間件
 * 全局檢測爬蟲訪問並標記請求
 */
@Injectable()
export class BotDetectionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BotDetectionMiddleware.name);
  private readonly botDetection = new BotDetectionService();

  use(req: Request, res: Response, next: NextFunction) {
    const userAgent = req.headers['user-agent'] || '';
    const isBot = this.botDetection.isSearchEngineBot(userAgent);
    const botType = this.botDetection.getBotType(userAgent);

    // 將檢測結果存儲在請求對象中
    req['isSearchEngineBot'] = isBot;
    req['isGoogleBot'] = this.botDetection.isGoogleBot(userAgent);
    req['botType'] = botType;
    req['userAgent'] = userAgent;

    if (isBot) {
      this.logger.debug(
        `🤖 檢測到搜索引擎爬蟲: ${req.method} ${req.path} - ${botType}`,
      );

      // 為爬蟲設置特殊的響應頭
      res.setHeader('X-Bot-Detected', 'true');
      res.setHeader('X-Bot-Type', botType || 'Unknown');
      res.setHeader(
        'X-Cache-Control',
        `public, max-age=${this.botDetection.getCacheTimeForBot(userAgent)}`,
      );

      // 記錄爬蟲訪問
      this.botDetection.logBotAccess(userAgent, req.path, 'access');
    }

    next();
  }
}
