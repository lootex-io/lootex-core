import {
  CacheModule as NestCacheModule,
  Module,
  Global,
  DynamicModule,
  CacheModuleAsyncOptions,
} from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()
@Module({})
export class CacheModule {
  public static forRootAsync(options: CacheModuleAsyncOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: [NestCacheModule.registerAsync(options)],
      providers: [CacheService],
      exports: [CacheService],
    };
  }

  public static register(options?: CacheModuleAsyncOptions): DynamicModule {
    return {
      module: CacheModule,
      imports: [NestCacheModule.register(options)],
      providers: [CacheService],
      exports: [CacheService],
    };
  }
}
