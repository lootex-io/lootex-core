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
import { AccountModule } from '@/api/v3/account/account.module';
import { LibsModule } from '@/common/libs/libs.module';

import { APP_GUARD } from '@nestjs/core';
import { WalletModule } from '@/api/v3/wallet/wallet.module';
import { ExploreModule } from '@/api/v3/explore/explore.module';
import { CoreModule } from '@/core/core.module';
import { PreviewReqInfoMiddleware } from '@/common/middleware/preview-req-info.middleware';
import { PinataModule } from '@/external/pinata/pinata.module';
import { StudioModule } from '@/api/v3/studio/studio.module';

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
    AccountModule,
    AssetModule,
    CollectionModule,
    ContractModule,
    ExploreModule,

    LibsModule,
    OrderModule,
    PinataModule,

    WalletModule,
    StudioModule,
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
