import { Injectable, Logger } from '@nestjs/common';
import { Cron, Timeout } from '@nestjs/schedule';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { CollectionVolumeViewTableName } from '@/api/v3/collection/collection.interface';

@Injectable()
export class BatchCollectionVolumeService {
  private readonly logger = new Logger(BatchCollectionVolumeService.name);

  constructor(private readonly collectionService: CollectionService) {}

  @Cron('0 0 */1 * * *')
  async handleCron() {
    this.logger.debug('called per 1 hour');
    await this.collectionService.updateCollectionVolumeByViewTableName(
      CollectionVolumeViewTableName.TODAY,
    );
    await this.collectionService.updateCollectionVolumeByViewTableName(
      CollectionVolumeViewTableName.SEVEN_DAY,
    );
    await this.collectionService.updateCollectionVolumeByViewTableName(
      CollectionVolumeViewTableName.THIRTY_DAY,
    );
    await this.collectionService.updateCollectionVolumeByViewTableName(
      CollectionVolumeViewTableName.ALL_DAY,
    );
  }

  @Timeout(0)
  async handleTimeout() {
    this.logger.debug('Called once start');
    await this.collectionService.updateCollectionVolumeByViewTableName(
      CollectionVolumeViewTableName.TODAY,
    );
    await this.collectionService.updateCollectionVolumeByViewTableName(
      CollectionVolumeViewTableName.SEVEN_DAY,
    );
    await this.collectionService.updateCollectionVolumeByViewTableName(
      CollectionVolumeViewTableName.THIRTY_DAY,
    );
    await this.collectionService.updateCollectionVolumeByViewTableName(
      CollectionVolumeViewTableName.ALL_DAY,
    );
  }
}
