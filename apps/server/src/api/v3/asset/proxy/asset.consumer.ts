import { Process, Processor } from '@nestjs/bull';
import { ApiJobData, QueueAsset } from '@/core/bull-queue/bull-queue.constant';
import { Logger } from '@nestjs/common';
import { WaitAndCache } from '@/core/bull-queue/cache/wait-and-cache.decorator';
import { Job } from 'bull';
import { AssetDataService } from '@/api/v3/asset/proxy/asset-data.service';

@Processor(QueueAsset.name)
export class AssetConsumer {
  private logger = new Logger(AssetConsumer.name);
  constructor(private readonly dataService: AssetDataService) {}

  @Process(QueueAsset.process.assetInfo)
  @WaitAndCache()
  assetInfo(job: Job<ApiJobData>) {
    this.logger.log(`assetInfo ${JSON.stringify(job.data)}`);
    const { data } = job.data;
    return this.dataService.getAssetInfo(data);
  }
}
