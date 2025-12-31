import { Injectable, Logger } from '@nestjs/common';
import { AssetExtra } from '@/model/entities';
import { InjectModel } from '@nestjs/sequelize';
import { AssetExtraDao } from '@/core/dao/asset-extra-dao';
import { CacheService } from '@/common/cache';

@Injectable()
export class AssetExtraService {
  private readonly logger = new Logger(AssetExtraService.name);

  constructor(
    @InjectModel(AssetExtra)
    private assetExtraRepository: typeof AssetExtra,

    private readonly cacheService: CacheService,

    private readonly extraDao: AssetExtraDao,
  ) {}

  async incrementAssetViews(
    assetId: string,
    views: number,
    opt: { ip: string; accountId: string },
  ) {
    const key = `asset_view_${assetId}_${opt.ip}_${opt.accountId}`;
    const isViewed = await this.cacheService.getCache(key);

    if (isViewed) {
      return;
    }

    await this.cacheService.setCache(key, '1', 60);

    return await this.assetExtraRepository.increment('viewCount', {
      by: views,
      where: { assetId: assetId },
    });
  }
}
