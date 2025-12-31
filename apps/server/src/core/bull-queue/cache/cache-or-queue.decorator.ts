import { Inject } from '@nestjs/common';
import {
  CACHE_API_DATA_DURATION,
  QUEUE_REDIS_JOB_LOCK,
} from '@/core/bull-queue/bull-queue.constant';
import { CacheService } from '@/common/cache';
import { Queue } from 'bull';
import { getCacheKey } from '@/common/decorator/cacheable.decorator';
import { ModuleRef } from '@nestjs/core';

export function CacheOrQueue(
  queueName: string,
  job: string,
  queueJobLock: number = QUEUE_REDIS_JOB_LOCK,
  ttl?: number,
) {
  ttl = ttl || CACHE_API_DATA_DURATION;
  const redisInjection = Inject(CacheService);
  const moduleRefInjection = Inject(ModuleRef);
  return (target, propertyKey, descriptor: PropertyDescriptor) => {
    redisInjection(target, 'redisService');
    moduleRefInjection(target, 'moduleRef');
    const originalMethod = descriptor.value; // 目标方法（handleBackgroundTask）
    descriptor.value = async function (...args: any[]) {
      const moduleRef: ModuleRef = this.moduleRef; // 获取 ModuleRef
      const data = args[0];
      const redisService: CacheService = this.redisService;

      const cacheKey = getCacheKey(
        `CacheOrQueue:${queueName}:${job}`,
        propertyKey,
        args,
        true,
      );
      const cacheData = await redisService.getCache(cacheKey);
      if (cacheData) {
        // console.log(`✅ 缓存命中：${cacheKey}`);
        const startTime = new Date().getTime();
        // 3️⃣ 触发后台任务（异步执行，不影响主流程）
        const lockKey = `${cacheKey}:lock`;
        const lockExists = await redisService.getCache(lockKey);
        if (!lockExists) {
          // console.log(`🚀 触发异步任务，执行后台逻辑`);
          await redisService.setCache(lockKey, '1', queueJobLock); // 3 秒锁
          const queue = await moduleRef.get<Queue>(`BullQueue_${queueName}`, {
            strict: false,
          });
          await queue.add(
            job,
            { cacheKey, data },
            {
              removeOnComplete: true, // 成功任务自动删除
              removeOnFail: 5, // 仅保留 5 个失败任务
            },
          );
        }
        const endTime = new Date().getTime();
        // console.log(`duration: ${(endTime - startTime) / 1000}`);
        return cacheData;
      } else {
        // console.log(`🚀 缓存未命中，执行实际方法逻辑`);
        const data = await originalMethod.apply(this, args);
        if (data) {
          // console.log(`✅ 任务完成，更新缓存 ${cacheKey}，TTL: ${ttl} 秒`);
          await redisService.setCache(cacheKey, data, ttl);
        }
        return data;
      }
    };
    return descriptor;
  };
}
