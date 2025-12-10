import { Injectable } from '@nestjs/common';
import { CacheService } from '@/common/cache';

/**
 * nonce 的核心作用是确保每个请求都具有唯一性，即使相同的数据在不同时间被发送
 * 生成时间戳 + 随机数的 nonce : const nonce = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
 */
@Injectable()
export class NonceService {
  constructor(private readonly cacheService: CacheService) {}

  // 检查 nonce 是否已经使用
  async hasBeenUsed(nonce: string): Promise<boolean> {
    const value = await this.cacheService.getCache(this._getCacheKey(nonce));
    return value === 1; // 如果 Redis 中存在该 nonce，返回 true
  }

  // 存储 nonce
  async markAsUsed(nonce: string): Promise<void> {
    // 将 nonce 存入 Redis，并设置过期时间（例如 5 分钟后过期）
    await this.cacheService.setCache(this._getCacheKey(nonce), 1, 5 * 60); // 5 分钟后过期
  }

  _getCacheKey(nonce: string) {
    return `nonce:${nonce}`;
  }
}
