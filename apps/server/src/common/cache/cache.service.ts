import { Cache } from 'cache-manager';
import { CACHE_MANAGER, Inject, Injectable, Logger } from '@nestjs/common';
import {
  AWS_SQS_ACCOUNT_SUMMARY_URL,
  AWS_SQS_WALLET_SUMMARY_URL,
  CACHE_EXPIRE_SECONDS,
  CONTRACT_UPDATE_ASSETS_QUEUE,
} from '../utils/constants';
import { ChainId } from '@/common/utils/types';

@Injectable()
export class CacheService {
  protected readonly logger = new Logger(CacheService.name);

  constructor(@Inject(CACHE_MANAGER) protected readonly cacheManager: Cache) {}

  async getCache<T>(key: string): Promise<T | undefined> {
    try {
      const value: T | undefined = await this.cacheManager.get<T>(key);
      // this.logger.debug(`get key: ${key}, value: ${JSON.stringify(value)}`);
      return value;
    } catch (e) {
      this.logger.error(e);
      return undefined;
    }
  }

  async setCache<T>(
    key: string,
    value: T,
    ttl?: number,
  ): Promise<T | undefined> {
    try {
      const savedValue: T | undefined = await this.cacheManager.set<T>(
        key,
        value,
        {
          ttl: ttl ? ttl : CACHE_EXPIRE_SECONDS,
        },
      );
      // this.logger.debug(
      //   `set key ${key} value ${JSON.stringify(value)} ttl ${ttl}`,
      // );

      return savedValue;
    } catch (e) {
      this.logger.error(e);
      return undefined;
    }
  }

  async delCache(key: string): Promise<boolean> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`del key ${key}`);
      return true;
    } catch (e) {
      this.logger.error(e);
      return false;
    }
  }

  async healthCheck() {
    try {
      await this.cacheManager.set('healthCheck', 'healthCheck');
      return true;
    } catch (e) {
      this.logger.error(`healthCheck ${e}`);
    }
    return false;
  }
}

export class CacheKeys {
  static chainIdKey(chainId: ChainId) {
    return `ChainId:${chainId}`;
  }

  static contractKeyWithChainId(chainId: ChainId, address: string) {
    return `Contract:${chainId}:${address}`;
  }

  static ethAccountKey(address: string) {
    return `EthAccount:${address}`;
  }

  static walletSummaryKey(address: string, contract?: string, chain?: number) {
    if (!contract) {
      return `${AWS_SQS_WALLET_SUMMARY_URL}-${chain}-${address.toLowerCase()}`;
    } else {
      return `${AWS_SQS_WALLET_SUMMARY_URL}-${chain}-${address.toLowerCase()}-${contract}`;
    }
  }

  static accountSummaryStatsKey(account: string) {
    return `${AWS_SQS_ACCOUNT_SUMMARY_URL}-${account}`;
  }

  static accountSummarySyncTaskKey() {
    return `${AWS_SQS_ACCOUNT_SUMMARY_URL}-accountSummarySyncTask`;
  }

  static contractAssetsQueueKey(chainId: number, contractAddress: string) {
    return `${CONTRACT_UPDATE_ASSETS_QUEUE}-${contractAddress}-${chainId}`;
  }

  static aggregatorOpenSeaDeleteSlugKey(slug: string) {
    return `aggregator:disableCollectionOrders:${slug}`;
  }

  static aggregatorOpenSeaNFTSoldKey(
    chainId: number,
    contract: string,
    tokenId: string,
  ) {
    return `aggregator:aggregatorOpenSeaNFTSoldKey:${chainId}:${contract}:${tokenId}`;
  }
}
