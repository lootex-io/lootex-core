import { Injectable, Logger } from '@nestjs/common';
import { Cron, Timeout } from '@nestjs/schedule';
import * as promise from 'bluebird';

import {
  QUEUE_STATUS,
  OWNER_UPDATE_ASSETS_QUEUE,
  QUEUE_ENV,
} from '@/common/utils';
import { ConfigurationService } from '@/configuration/configuration.service';
import { QueueService } from '@/external/queue/queue.service';
import { CacheService } from '@/common/cache/cache.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';

@Injectable()
export class BatchOwnerAssetsService {
  private readonly logger = new Logger(BatchOwnerAssetsService.name);

  constructor(
    private readonly configService: ConfigurationService,
    private readonly queueService: QueueService,
    private readonly cacheService: CacheService,
    private readonly assetService: AssetService,
  ) {
    // test
    // setTimeout(async () => {
    //   const address = '0xdcbc39410f19f4802e6672ac31c11db474638d61';
    //   const chainId = 137;
    //   let queueStatus = QUEUE_STATUS.PENDING;
    //
    //   const queueKey = `${OWNER_UPDATE_ASSETS_QUEUE}-${address.toLowerCase()}-${chainId}`;
    //   await this.cacheService.setCache(
    //     queueKey,
    //     {
    //       queueStatus,
    //       ownerAddress: address,
    //       chainId: chainId,
    //     },
    //     300,
    //   );
    //   await this.queueService.sendMessageToSqs(
    //     this.configService.get('AWS_SQS_OWNER_ASSETS_URL'),
    //     {
    //       ownerAddress: address,
    //       chainId: chainId,
    //     },
    //   );
    // }, 5000);
    // test
    // setTimeout(() =>
    //   this.assetService.updateAssetsByQueue({
    //     ownerAddress: '0xdF43664AEC3B994E1dD159EC59d45ba87927255b',
    //     chainId: '1946',
    //   }),
    // );
  }

  @logRunDuration(new Logger(BatchOwnerAssetsService.name))
  private async getOwnerAssets(payload): Promise<void> {
    // this.logger.debug(`getOwnerAssets call ${JSON.stringify(payload)}`);
    const cacheKey = `${OWNER_UPDATE_ASSETS_QUEUE}-${payload.ownerAddress.toLowerCase()}-${payload.chainId
      }`;
    const existCache: {
      queueStatus: QUEUE_STATUS;
      ownerAddress: string;
      chainId: string;
    } = await this.cacheService.getCache(cacheKey);

    if (
      existCache.queueStatus === QUEUE_STATUS.CONFIRM ||
      existCache.queueStatus === QUEUE_STATUS.RUNNING
    ) {
      this.logger.debug(
        `${existCache.ownerAddress} ${existCache.chainId} queue is confirmed or running in other thread, skip`,
      );
      return;
    }

    if (existCache.queueStatus === QUEUE_STATUS.PENDING) {
      await this.cacheService.setCache(
        cacheKey,
        {
          queueStatus: QUEUE_STATUS.RUNNING,
          ownerAddress: payload.ownerAddress,
          chainId: payload.chainId,
        },
        this.configService.get(QUEUE_ENV.QUEUE_OWNER_ASSETS_EXPIRED),
      );
    }

    try {
      await this.assetService.updateAssetsByQueue(payload);
    } catch (error) {
      this.logger.error(error);
    }

    await this.cacheService.setCache(
      cacheKey,
      {
        queueStatus: QUEUE_STATUS.CONFIRM,
        ownerAddress: payload.ownerAddress,
        chainId: payload.chainId,
      },
      this.configService.get(QUEUE_ENV.QUEUE_OWNER_ASSETS_EXPIRED),
    );
  }

  private async updateOwnerAssetsFromSqs(): Promise<void> {
    const { Messages: messages } =
      await this.queueService.receiveMessageFromSqs(
        this.configService.get('AWS_SQS_OWNER_ASSETS_URL'),
      );
    // this.logger.debug(`messages = ${JSON.stringify(messages)}`);

    if (!messages) {
      return promise.resolve();
    }

    await promise.map(messages, async (message) => {
      // this.logger.debug(`message = ${message}`);
      await this.queueService.deleteMessageFromSqs(
        this.configService.get('AWS_SQS_OWNER_ASSETS_URL'),
        message?.ReceiptHandle,
      );
      await this.getOwnerAssets(JSON.parse(message.Body));
    });
  }

  @Cron('*/20 * * * * *')
  async handleCron() {
    await this.updateOwnerAssetsFromSqs();
  }

  @Timeout(0)
  async handleTimeout() {
    await this.updateOwnerAssetsFromSqs();
  }
}
