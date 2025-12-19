import { Injectable } from '@nestjs/common';
import { AssetChainFamilyParamsDTO } from '@/api/v3/asset/asset.dto';
import { AssetDataService } from '@/api/v3/asset/proxy/asset-data.service';
import { CacheOrQueue } from '@/core/bull-queue/cache/cache-or-queue.decorator';
import { QueueAsset } from '@/core/bull-queue/bull-queue.constant';

@Injectable()
export class AssetProxyService {
  constructor(private readonly assetDataService: AssetDataService) {}

  @CacheOrQueue(QueueAsset.name, QueueAsset.process.assetInfo)
  getAssetInfo(dto: AssetChainFamilyParamsDTO) {
    return this.assetDataService.getAssetInfo(dto);
  }
}
