import { Module, Global } from '@nestjs/common';
import { BotDetectionService } from '@/common/services/bot-detection.service';
import { BotDetectionGuard } from '@/common/guards/bot-detection.guard';

/**
 * 搜索引擎爬蟲檢測模塊
 * 提供全局的爬蟲檢測功能
 */
@Global()
@Module({
  providers: [BotDetectionService, BotDetectionGuard],
  exports: [BotDetectionService, BotDetectionGuard],
})
export class BotDetectionModule {}
