import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import {
  ApiJobData,
  QueueCollection,
} from '@/core/bull-queue/bull-queue.constant';
import { WaitAndCache } from '@/core/bull-queue/cache/wait-and-cache.decorator';
import { CollectionDataService } from '@/api/v3/collection/proxy/collection-data.service';

@Processor(QueueCollection.name)
export class CollectionConsumer {
  private logger = new Logger(CollectionConsumer.name);
  constructor(private readonly collectionCoreService: CollectionDataService) {}

  @Process(QueueCollection.process.collectionInfo)
  @WaitAndCache()
  collectionInfo(job: Job<ApiJobData>) {
    this.logger.log(`collectionInfo ${JSON.stringify(job.data)}`);
    const { data } = job.data;
    return this.collectionCoreService.getCollectionInfo(data);
  }
}
