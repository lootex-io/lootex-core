import { Injectable, Logger } from '@nestjs/common';
import { Cron, Timeout } from '@nestjs/schedule';
import * as promise from 'bluebird';

import {
  QUEUE_STATUS,
  ASSET_UPDATE_METADATA_QUEUE_PREFIX,
} from '@/common/utils';
import { ConfigurationService } from '@/configuration/configuration.service';
import { CacheService } from '@/common/cache/cache.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';
import { AssetDao } from '@/core/dao/asset-dao';

@Injectable()
export class BatchAssetMetadataService {
  private readonly logger = new Logger(BatchAssetMetadataService.name);

  constructor(
    private readonly configService: ConfigurationService,
    private readonly cacheService: CacheService,
    private readonly assetService: AssetService,
    private readonly assetDao: AssetDao,
  ) { }

  @logRunDuration(new Logger(BatchAssetMetadataService.name))
  private async getAssetMetadata(payload): Promise<void> {
    // this.logger.debug(payload);
    const cacheKey = `${ASSET_UPDATE_METADATA_QUEUE_PREFIX}-${payload.contractAddress.toLowerCase()}-${payload.tokenId
      }-${payload.chainId}`;
    const existCache: {
      queueStatus: QUEUE_STATUS;
      contractAddress: string;
      tokenId: string;
      chainId: string;
      fromAddress?: string;
      toAddress?: string;
    } = await this.cacheService.getCache(cacheKey);

    if (
      existCache?.queueStatus === QUEUE_STATUS.CONFIRM ||
      existCache?.queueStatus === QUEUE_STATUS.RUNNING
    ) {
      this.logger.debug(
        `${existCache.contractAddress} #${existCache.tokenId} ${existCache.chainId} queue is confirmed or running in other thread, skip`,
      );
      return;
    }

    if (existCache?.queueStatus === QUEUE_STATUS.PENDING) {
      await this.cacheService.setCache(
        cacheKey,
        {
          queueStatus: QUEUE_STATUS.RUNNING,
          contractAddress: payload.contractAddress,
          tokenId: payload.tokenId,
          chainId: payload.chainId,
        },
        10,
      );
    }

    try {
      const assetKey = {
        contractAddress: payload.contractAddress,
        chainId: payload.chainId,
        tokenId: payload.tokenId,
      };
      if (payload.fromAddress) {
        await this.assetDao.syncAssetOnChain(assetKey, {
          fromAddress: payload.fromAddress,
          toAddress: payload.toAddress,
        });
      } else {
        await this.assetDao.syncAssetOnChain(assetKey);
      }
    } catch (error) {
      this.logger.error(error);
    }

    await this.cacheService.setCache(
      cacheKey,
      {
        queueStatus: QUEUE_STATUS.CONFIRM,
        contractAddress: payload.contractAddress,
        tokenId: payload.tokenId,
        chainId: payload.chainId,
        fromAddress: payload.fromAddress,
        toAddress: payload.toAddress,
      },
      10,
    );
  }

  private async updateAssetMetadataFromSqs(): Promise<void> {
    return promise.resolve();
  }

  @Cron('*/20 * * * * *')
  async handleCron() {
    // await this.updateAssetMetadataFromSqs();
  }

  @Timeout(0)
  async handleTimeout() {
    // await this.updateAssetMetadataFromSqs();
  }
}
