import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import {
  ApiJobData,
  QueueExplore,
} from '@/core/bull-queue/bull-queue.constant';
import { WaitAndCache } from '@/core/bull-queue/cache/wait-and-cache.decorator';
import { ExploreDataService } from '@/api/v3/explore/proxy/explore-data.service';

@Processor(QueueExplore.name)
export class ExploreConsumer {
  private logger = new Logger(ExploreConsumer.name);
  constructor(private readonly dataService: ExploreDataService) {}

  @Process(QueueExplore.process.assets)
  @WaitAndCache(3)
  assets(job: Job<ApiJobData>) {
    this.logger.log(`assets ${JSON.stringify(job.data)}`);
    const { data } = job.data;
    return this.dataService.assets(data);
  }
}
