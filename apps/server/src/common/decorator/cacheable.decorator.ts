import { createHash } from 'crypto';
import * as serialize from 'serialize-javascript';
import { Inject } from '@nestjs/common';
import { CacheService } from '@/common/cache';

export function Cacheable(
  options: {
    key?: string;
    seconds?: number;
    keyHash?: boolean;
  } = {},
) {
  if (options.seconds === null || options.seconds === undefined) {
    options.seconds = 3; // 3 second
  }
  if (options.keyHash === null || options.keyHash === undefined) {
    options.keyHash = true;
  }
  const redisInjection = Inject(CacheService);
  return (
    target: Object,
    propertyKey: string,
    descriptor?: PropertyDescriptor,
  ) => {
    redisInjection(target, 'redisService');

    const originalMethod = descriptor?.value;

    const newDescriptor: PropertyDescriptor = {
      ...descriptor,
      value: async function (...args: any[]): Promise<any> {
        const redisService: CacheService = this.redisService;
        // If there is no client, no-op is enabled (else we would have thrown before),
        // just return the result of the decorated method (no caching)

        const healthCheck = await redisService?.healthCheck();
        if (!healthCheck) {
          // console.warn('Redis init error');
          return originalMethod?.apply(this, args);
        }

        const finalKey = getCacheKey(
          options.key,
          propertyKey,
          args,
          options.keyHash,
        );
        const cacheData = await redisService.getCache(finalKey);
        // console.log("cacheData", cacheData);
        if (cacheData) {
          // console.log('use cacheData finalKey', finalKey);
          return cacheData;
        } else {
          const data = await originalMethod?.apply(this, args);
          if (data) {
            await redisService.setCache(finalKey, data, options.seconds);
          }
          return data;
        }
      },
    };
    return newDescriptor;
  };
}

interface CacheOptions {
  key: string;
  seconds: number;
}

export const getCacheKey = (
  passedInKey: string | string[],
  methodName: string,
  args: any[],
  enHash,
): string => {
  // Fall back to a default value (md5 hash of serialized arguments and context,
  // which is the instance the method was called from)
  const callMap = {
    methodName,
    args,
  };
  // console.log("callMap ", callMap);
  const serializedKey = serialize(callMap);
  // console.log(serializedKey);
  let hash = serializedKey;
  if (enHash) {
    hash = createHash('md5').update(serializedKey).digest('hex');
  }
  if (passedInKey) {
    return `${passedInKey}:${hash}`;
  }
  return hash;
};
