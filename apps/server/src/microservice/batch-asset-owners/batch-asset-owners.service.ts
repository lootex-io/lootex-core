import { Injectable, Logger } from '@nestjs/common';
import { Cron, Timeout } from '@nestjs/schedule';
import * as promise from 'bluebird';

import {
  QUEUE_STATUS,
  QUEUE_ENV,
  ASSET_UPDATE_OWNERS_QUEUE_PREFIX,
} from '@/common/utils';
import { ConfigurationService } from '@/configuration/configuration.service';
import { CacheService } from '@/common/cache/cache.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';

@Injectable()
export class BatchAssetOwnersService {
  private readonly logger = new Logger(BatchAssetOwnersService.name);

  constructor(
    private readonly configService: ConfigurationService,
    private readonly cacheService: CacheService,
    private readonly assetService: AssetService,
  ) { }

  @logRunDuration(new Logger(BatchAssetOwnersService.name))
  private async getOwnerAsset(payload): Promise<void> {
    this.logger.debug(payload);
    const cacheKey = `${ASSET_UPDATE_OWNERS_QUEUE_PREFIX}-${payload.contractAddress}-${payload.tokenId}-${payload.chainId}`;
    const existCache: {
      queueStatus: QUEUE_STATUS;
      contractAddress: string;
      tokenId: string;
      chainId: string;
    } = await this.cacheService.getCache(cacheKey);

    if (
      existCache.queueStatus === QUEUE_STATUS.CONFIRM ||
      existCache.queueStatus === QUEUE_STATUS.RUNNING
    ) {
      this.logger.debug(
        `${existCache.contractAddress} #${existCache.tokenId} ${existCache.chainId} queue is confirmed or running in other thread, skip`,
      );
      return;
    }

    if (existCache.queueStatus === QUEUE_STATUS.PENDING) {
      await this.cacheService.setCache(
        cacheKey,
        {
          queueStatus: QUEUE_STATUS.RUNNING,
          contractAddress: payload.contractAddress,
          tokenId: payload.tokenId,
          chainId: payload.chainId,
        },
        this.configService.get(QUEUE_ENV.QUEUE_ASSET_OWNERS_EXPIRED),
      );
    }

    try {
      await this.assetService.updateAssetOwnersByQueue(payload);
    } catch (error) {
      this.logger.error(error);
    }

    await this.cacheService.setCache(
      cacheKey,
      {
        queueStatus: QUEUE_STATUS.CONFIRM,
        contractAddress: payload.contractAddress,
        chainId: payload.chainId,
        tokenId: payload.tokenId,
      },
      this.configService.get(QUEUE_ENV.QUEUE_ASSET_OWNERS_EXPIRED),
    );
  }

  private async updateAssetOwnersFromSqs(): Promise<void> {
    return promise.resolve();
  }

  @Cron('*/20 * * * * *')
  async handleCron() {
    // await this.updateAssetOwnersFromSqs();
  }

  @Timeout(0)
  async handleTimeout() {
    // await this.updateAssetOwnersFromSqs();
  }
}
