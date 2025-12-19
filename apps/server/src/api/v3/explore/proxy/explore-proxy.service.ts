import { Injectable } from '@nestjs/common';
import { ExploreDataService } from '@/api/v3/explore/proxy/explore-data.service';
import { CacheOrQueue } from '@/core/bull-queue/cache/cache-or-queue.decorator';
import { QueueExplore } from '@/core/bull-queue/bull-queue.constant';
import { keywordsAssetsQueryDTO } from '@/api/v3/explore/explore.dto';

@Injectable()
export class ExploreProxyService {
  constructor(private readonly dataService: ExploreDataService) {}

  @CacheOrQueue(QueueExplore.name, QueueExplore.process.assets, 2, 3)
  assets(dto: keywordsAssetsQueryDTO) {
    return this.dataService.assets(dto);
  }

  @CacheOrQueue(QueueExplore.name, QueueExplore.process.assets, 2, 3)
  assetsTest(dto: keywordsAssetsQueryDTO) {
    return this.dataService.assetsTest(dto);
  }
}
