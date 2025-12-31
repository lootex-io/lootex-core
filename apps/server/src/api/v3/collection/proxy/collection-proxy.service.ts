import { Injectable } from '@nestjs/common';
import { CacheOrQueue } from '@/core/bull-queue/cache/cache-or-queue.decorator';
import { QueueCollection } from '@/core/bull-queue/bull-queue.constant';
import { CollectionParamsDTO } from '@/api/v3/collection/collection.dto';
import { CollectionDataService } from '@/api/v3/collection/proxy/collection-data.service';

@Injectable()
export class CollectionProxyService {
  constructor(private readonly collectionDataService: CollectionDataService) {}

  @CacheOrQueue(QueueCollection.name, QueueCollection.process.collectionInfo)
  async getCollectionInfo(dto: CollectionParamsDTO) {
    return this.collectionDataService.getCollectionInfo(dto);
  }
}
