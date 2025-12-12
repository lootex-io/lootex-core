import { Module, Global } from '@nestjs/common';

import { BotDetectionGuard } from '@/common/guards/bot-detection.guard';

/**
 * 搜索引擎爬蟲檢測模塊
 * 提供全局的爬蟲檢測功能
 */
@Global()
@Module({
  providers: [BotDetectionGuard],
  exports: [BotDetectionGuard],
})
export class BotDetectionModule { }
