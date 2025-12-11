import { OrderModule } from '@/api/v3/order/order.module';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AssetModule } from '@/api/v3/asset/asset.module';
import { CollectionModule } from '@/api/v3/collection/collection.module';
import { ConfigurationService } from '@/configuration';
import { ContractModule } from '@/api/v3/contract/contract.module';
import { AuthModule } from '@/api/v3/auth/auth.module';

import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { HealthModule } from '@/common/health/health.module';
import { StorageModule } from '@/external/storage/storage.module';
import { AccountModule } from '@/api/v3/account/account.module';
import { LibsModule } from '@/common/libs/libs.module';
import { CurrencyModule } from '@/api/v3/currency/currency.module';
import { PinataModule } from '@/external/pinata/pinata.module';
import { QueueModule } from './external/queue/queue.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { WalletModule } from '@/api/v3/wallet/wallet.module';
import { ExploreModule } from './api/v3/explore/explore.module';
import { CoreModule } from '@/core/core.module';
import { PreviewReqInfoMiddleware } from '@/common/middleware/preview-req-info.middleware';
import { AggregatorApiModule } from '@/api/v3/aggregator-api/aggregator.module';
import { AccountGpModule } from '@/api/v3/account-gp/account-gp.module';
import { StudioUploadModule } from '@/api/v3/studio/upload/studio-upload.module';
import { StudioModule } from './api/v3/studio/studio.module';
import { StudioIpfsModule } from './microservice/studio-ipfs/studio-ipfs.module';
import { HmacModule } from '@/api/v3/hmac/hmac.module';

@Module({
  imports: [
    CoreModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigurationService],
      useFactory: async (config: ConfigurationService) => {
        return {
          ttl: config.get('THROTTLER_TTL'),
          limit: config.get('THROTTLER_LIMIT'),
        };
      },
    }),
    HealthModule.forRootAsync({
      inject: [ConfigurationService],
      useFactory: async (config: ConfigurationService) => ({
        db: {
          enabled: true,
        },
        redis: {
          enabled: true,
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
    }),
    AuthModule.forRootAsync({
      inject: [ConfigurationService],
      useFactory: async () => ({}),
    }),
    // SentryModule.forRootAsync({
    //   inject: [ConfigurationService],
    //   enable: !!process.env.SENTRY_DSN,
    //   useFactory: async (config: ConfigurationService) => ({
    //     dsn: config.get('SENTRY_DSN'),
    //     debug: false,
    //     release: config.get('BUILD_ID'),
    //     environment: config.get('NODE_ENV'),
    //     tracesSampleRate: 1.0,
    //     logLevel: 'info',
    //     close: {
    //       enabled: true,
    //     },
    //   }),
    // }),
    // QueueModule.forRootAsync({
    //   type: PUBSUB_QUEUE,
    //   pubsubOptions: {
    //     inject: [ConfigurationService],
    //     useFactory: async (config: ConfigurationService) => ({
    //       projectName: config.get('GCP_PROJECT_NAME'),
    //     }),
    //   },
    // }),
    HmacModule,
    AccountModule,
    AssetModule,
    CollectionModule,
    ContractModule,
    CurrencyModule,
    ExploreModule,

    LibsModule,
    OrderModule,
    PinataModule,
    QueueModule,
    StorageModule,

    WalletModule,
    AggregatorApiModule,
    AccountGpModule,
    StudioUploadModule,
    StudioModule,
    StudioIpfsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(PreviewReqInfoMiddleware).forRoutes('*');
  }
}
