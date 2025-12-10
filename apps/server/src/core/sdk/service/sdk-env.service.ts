import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { GlobalValue } from '@/model/entities';
import { SdkEnv } from '@/core/sdk/constants/env-constants';
import { CacheService } from '@/common/cache';

@Injectable()
export class SdkEnvService {
  // public envMaps = new Map<string, any>();
  private envExpiredSeconds = 86400 * 365; // 缓存时间 一年
  constructor(
    @InjectModel(GlobalValue)
    private globalValueRepository: typeof GlobalValue,

    private cacheService: CacheService,
  ) {
    // init
    setTimeout(() => {
      this.load().then(() => {});
    }, 500);
  }

  _getEnvKey(key: string) {
    return `GlobalValues:${key}`;
  }

  async load() {
    const items = await this.globalValueRepository.findAll();
    for (const item of items) {
      // this.envMaps.set(item.key, item.value);
      await this.cacheService.setCache(
        this._getEnvKey(item.key),
        item.value,
        this.envExpiredSeconds,
      );
    }
  }

  async getValue(key: SdkEnv) {
    const value = await this.cacheService.getCache<string>(
      this._getEnvKey(key),
    );
    if (value != null) {
      return value;
    } else {
      await this.load();
      return await this.cacheService.getCache<string>(this._getEnvKey(key));
    }
  }

  async getNumber(key: SdkEnv) {
    return +(await this.getValue(key));
  }

  async getString(key: SdkEnv) {
    return await this.getValue(key);
  }
}
