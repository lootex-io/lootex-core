import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { BotDetectionService } from '@/common/services/bot-detection.service';
import {
  SKIP_BOT_CHECK,
  BOT_ONLY,
} from '@/common/decorators/bot-detection.decorator';

/**
 * 搜索引擎爬蟲檢測守衛
 * 用於檢測爬蟲訪問並提供相應的處理策略
 */
@Injectable()
export class BotDetectionGuard implements CanActivate {
  private readonly logger = new Logger(BotDetectionGuard.name);
  private readonly botDetection = new BotDetectionService();

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userAgent = request.headers['user-agent'] || '';

    // 檢查是否跳過爬蟲檢測
    const skipBotCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_BOT_CHECK,
      [context.getHandler(), context.getClass()],
    );

    if (skipBotCheck) {
      return true;
    }

    // 檢查是否僅允許爬蟲訪問
    const botOnly = this.reflector.getAllAndOverride<boolean>(BOT_ONLY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (botOnly) {
      const isBot = this.botDetection.isSearchEngineBot(userAgent);
      if (!isBot) {
        this.logger.debug(`🚫 非爬蟲訪問被拒絕: ${userAgent}`);
        return false;
      }
    }

    // 檢測爬蟲並標記請求
    const isBot = this.botDetection.isSearchEngineBot(userAgent);
    const isGoogleBot = this.botDetection.isGoogleBot(userAgent);
    const botType = this.botDetection.getBotType(userAgent);

    request['isSearchEngineBot'] = isBot;
    request['isGoogleBot'] = isGoogleBot;
    request['botType'] = botType;

    if (isBot) {
      this.botDetection.logBotAccess(userAgent, request.path, 'guarded access');
    }

    return true; // 允許請求繼續，但標記為爬蟲
  }
}
