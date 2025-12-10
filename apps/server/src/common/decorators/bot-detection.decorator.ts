import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { BotDetectionService } from '@/common/services/bot-detection.service';

/**
 * 跳過爬蟲檢測的元數據鍵
 */
export const SKIP_BOT_CHECK = 'skipBotCheck';

/**
 * 跳過爬蟲檢測的裝飾器
 */
export const SkipBotCheck = () => SetMetadata(SKIP_BOT_CHECK, true);

/**
 * 僅允許爬蟲訪問的元數據鍵
 */
export const BOT_ONLY = 'botOnly';

/**
 * 僅允許爬蟲訪問的裝飾器
 */
export const BotOnly = () => SetMetadata(BOT_ONLY, true);

/**
 * 獲取是否為搜索引擎爬蟲的參數裝飾器
 */
export const IsSearchEngineBot = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest();
    return request['isSearchEngineBot'] || false;
  },
);

/**
 * 獲取是否為 Google Bot 的參數裝飾器
 */
export const IsGoogleBot = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): boolean => {
    const request = ctx.switchToHttp().getRequest();
    return request['isGoogleBot'] || false;
  },
);

/**
 * 獲取爬蟲類型的參數裝飾器
 */
export const BotType = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request['botType'] || null;
  },
);

/**
 * 獲取 User Agent 的參數裝飾器
 */
export const UserAgent = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request['userAgent'] || '';
  },
);

/**
 * 檢查是否應該跳過操作的裝飾器
 */
export const ShouldSkipOperation = createParamDecorator(
  (
    operationType: 'database' | 'sync' | 'aggregator' = 'database',
    ctx: ExecutionContext,
  ): boolean => {
    const request = ctx.switchToHttp().getRequest();
    const userAgent = request['userAgent'] || '';
    const botDetection = new BotDetectionService();

    switch (operationType) {
      case 'database':
        return botDetection.shouldSkipDatabaseOperations(userAgent);
      case 'sync':
        return botDetection.shouldSkipSyncOperations(userAgent);
      case 'aggregator':
        return botDetection.shouldSkipAggregatorOperations(userAgent);
      default:
        return botDetection.shouldSkipDatabaseOperations(userAgent);
    }
  },
);
