import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { ConfigurationModule, ConfigurationService } from '@/configuration';

@Module({
  imports: [ConfigurationModule],
  providers: [QueueService, ConfigurationService],
  exports: [QueueService],
})
export class QueueModule {}
