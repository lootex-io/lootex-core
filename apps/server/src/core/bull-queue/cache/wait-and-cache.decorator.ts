import { Inject } from '@nestjs/common';
import { CacheService } from '@/common/cache';
import { CACHE_API_DATA_DURATION } from '@/core/bull-queue/bull-queue.constant';

/**
 * 等待函数执行，并缓存结果
 * @param ttl 单位s
 * @constructor
 */
export function WaitAndCache(ttl?: number): MethodDecorator {
  ttl = ttl || CACHE_API_DATA_DURATION; // 默认1天
  const redisInjection = Inject(CacheService);
  return function (target, propertyKey, descriptor: PropertyDescriptor) {
    redisInjection(target, 'redisService');
    const originalMethod = descriptor.value; // 目标方法（handleBackgroundTask）
    descriptor.value = async function (...args: any[]) {
      const job = args[0]; // 获取 Bull 任务
      const { cacheKey } = job.data; // ApiJobDto 类型
      const redisService: CacheService = this.redisService;
      // console.log(
      //   `WaitAndCache: ⏳ 执行方法 ${String(propertyKey)}，等待任务完成`,
      // );
      const result = await originalMethod.apply(this, args); // 执行原始方法

      if (result) {
        // console.log(
        //   `WaitAndCache: ✅ 任务完成，更新缓存 ${cacheKey}，TTL: ${ttl} 秒`,
        // );
        await redisService.setCache(cacheKey, result, ttl);
      }
      return result;
    };
    return descriptor;
  };
}
