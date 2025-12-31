import { Injectable, Logger } from '@nestjs/common';
import { Cron, Timeout } from '@nestjs/schedule';
import * as promise from 'bluebird';
import {
  CONTRACT_UPDATE_ASSETS_QUEUE,
  QUEUE_STATUS,
  QUEUE_ENV,
} from '@/common/utils';
import { ConfigurationService } from '@/configuration/configuration.service';
import { CacheService } from '@/common/cache/cache.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';

@Injectable()
export class BatchContractAssetsService {
  private readonly logger = new Logger(BatchContractAssetsService.name);

  constructor(
    private readonly configService: ConfigurationService,
    private readonly cacheService: CacheService,
    private readonly contractService: ContractService,
  ) {
    // this.contractService.updateAssetsByQueue({
    //   contractAddress: '0xc799d8f3ad911a03ac1e1f93baa2e961b4047803',
    //   chainId: '5000',
    // });
    // this.contractService.updateAssetsByQueue({
    //   contractAddress: '0x29e631e983ea4d031b376913bf82edc1c8567fb1',
    //   chainId: '8453',
    // });
    // this.contractService.updateAssetsByQueue({
    //   contractAddress: '0xefdbe9a86a0ccdf905e566a6ca809b85a3214ffc',
    //   chainId: '1',
    // });
    // this.contractService.updateAssetsByQueue({
    //   contractAddress: '0xb1f13801c5a0ad7d4bd5243db872f44b6030651a',
    //   chainId: '8453',
    // });
    //
    // this.contractService.updateAssetsByQueue({
    //   contractAddress: '0xee7d1b184be8185adc7052635329152a4d0cdefa',
    //   chainId: '8453',
    // });
    // this.contractService.updateAssetsByQueue({
    //   contractAddress: '0x5c672a07223ec11ce67946e801039680e1054ffc',
    //   chainId: '8453',
    // });
    // this.contractService.updateAssetsByQueue({
    //   contractAddress: '0x3bb0a012e300757ea7f19ee15df95a6fb5159971',
    //   chainId: '1946',
    // });
  }

  @logRunDuration(new Logger(BatchContractAssetsService.name))
  private async getContractAssets(payload): Promise<void> {
    this.logger.debug(payload);
    const cacheKey = `${CONTRACT_UPDATE_ASSETS_QUEUE}-${payload.contractAddress}-${payload.chainId}`;
    const existCache: {
      queueStatus: QUEUE_STATUS;
      contractAddress: string;
      chainId: string;
    } = await this.cacheService.getCache(cacheKey);

    if (
      existCache.queueStatus === QUEUE_STATUS.CONFIRM ||
      existCache.queueStatus === QUEUE_STATUS.RUNNING
    ) {
      this.logger.debug(
        `${existCache.contractAddress} ${existCache.chainId} queue is confirmed or running in other thread, skip`,
      );
      return;
    }

    if (existCache.queueStatus === QUEUE_STATUS.PENDING) {
      await this.cacheService.setCache(
        cacheKey,
        {
          queueStatus: QUEUE_STATUS.RUNNING,
          contractAddress: payload.contractAddress,
          chainId: payload.chainId,
        },
        this.configService.get(QUEUE_ENV.QUEUE_CONTRACT_ASSETS_EXPIRED),
      );
    }

    try {
      await this.contractService.updateAssetsByQueue(payload);
    } catch (error) {
      this.logger.error(error);
    }

    await this.cacheService.setCache(
      cacheKey,
      {
        queueStatus: QUEUE_STATUS.CONFIRM,
        contractAddress: payload.contractAddress,
        chainId: payload.chainId,
      },
      this.configService.get(QUEUE_ENV.QUEUE_CONTRACT_ASSETS_EXPIRED),
    );
  }

  private async updateContractAssetsFromSqs(): Promise<void> {
    return promise.resolve();
  }

  @Cron('*/20 * * * * *')
  async handleCron() {
    // await this.updateContractAssetsFromSqs();
  }

  @Timeout(0)
  async handleTimeout() {
    // await this.updateContractAssetsFromSqs();
  }
}
