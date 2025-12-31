import { Injectable, Logger } from '@nestjs/common';
import { Cron, Timeout } from '@nestjs/schedule';

@Injectable()
export class BatchCollectionVolumeService {
  private readonly logger = new Logger(BatchCollectionVolumeService.name);

  @Cron('0 0 */1 * * *')
  async handleCron() {
    this.logger.debug('collection volume batch job is disabled');
  }

  @Timeout(0)
  async handleTimeout() {
    this.logger.debug('collection volume batch job is disabled');
  }
}
