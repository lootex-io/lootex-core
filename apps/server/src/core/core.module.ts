import { Global, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { CacheModule } from '@/common/cache';
import * as redisStore from 'cache-manager-ioredis';
import { ConfigurationModule, ConfigurationService } from '@/configuration';
import { LoggerModule } from 'nestjs-pino';
import { HttpModule } from '@nestjs/axios';
import { AssetDao } from '@/core/dao/asset-dao';
import { RpcService } from '@/core/third-party-api/rpc/rpc.service';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { CurrencyService } from '@/core/third-party-api/currency/currency.service';
import { CollectionDao } from '@/core/dao/collection-dao';
import { LibsDao } from '@/core/dao/libs-dao';
import { LibsService } from '@/common/libs/libs.service';
import { AssetExtraDao } from '@/core/dao/asset-extra-dao';
import { TraitDao } from '@/core/dao/trait-dao';
import { ImportCollectionLogService } from '@/core/import-collection-log/import-collection-log.service';
import { CWLogService } from '@/core/third-party-api/cloudwatch-log/cw-log.service';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionFilter } from '@/core/exception/all-exception.filter';
import { AppLogger } from '@/core/log/app-log';
import { SeaportOrderHistoryDao } from '@/core/dao/seaport-order-history-dao';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';
import { OrderDao } from '@/core/dao/order-dao';
import { LogService } from '@/core/log/log.service';

import { providers } from '@/model/providers';

import { EventPollerDao } from '@/core/dao/event-poller.dao';
import { MoralisNftApiService } from '@/core/third-party-api/moralis/moralis-nft-api.service';
import { AlchemyNftApiService } from '@/core/third-party-api/alchemy/alchemy-nft-api.service';
import { NftscanNftApiService } from '@/core/third-party-api/nftscan/nftscan-nft-api.service';

import { BullModule } from '@nestjs/bull';
import { BullQueueModule } from '@/core/bull-queue/bull-queue.module';
import { OrderQueueService } from '@/core/bull-queue/queue/order-queue.service';

interface CoreOptions {
  dbPoolMax?: number;
  dbPoolMin?: number;
  dbPoolAcquire?: number;
  dbPoolIdle?: number;
}

@Global()
@Module({})
export class CoreModule {
  private tag = CoreModule.name;

  constructor() {}

  static forRoot(options?: CoreOptions) {
    options = {
      dbPoolMax: 16,
      dbPoolMin: 0,
      dbPoolAcquire: 60000,
      dbPoolIdle: 10000,
      ...options,
    };

    return {
      module: CoreModule,
      imports: [
        BullModule.forRootAsync({
          inject: [ConfigurationService],
          useFactory: async (config: ConfigurationService) => {
            return {
              prefix: 'LootexQueue',
              redis: {
                host: config.get('REDIS_HOST'),
                port: config.get('REDIS_PORT'),
                password: config.get('REDIS_PASSWORD'),
              },
            };
          },
        }),
        BullQueueModule,
        ConfigurationModule,
        LoggerModule.forRootAsync({
          inject: [ConfigurationService],
          useFactory: async (config: ConfigurationService) => {
            return {
              ...(config.get('NODE_ENV') !== 'production' && {
                useExisting: true,
                pinoHttp: {
                  level:
                    config.get('NODE_ENV') !== 'production' ? 'debug' : 'log',
                  transport: {
                    target: 'pino-pretty',
                  },
                },
              }),
            };
          },
        }),
        CacheModule.forRootAsync({
          inject: [ConfigurationService],
          useFactory: async (config: ConfigurationService) => ({
            store: redisStore,
            host: config.get('REDIS_HOST'),
            port: config.get('REDIS_PORT'),
            password: config.get('REDIS_PASSWORD'),
          }),
        }),
        HttpModule,
        SequelizeModule.forRootAsync({
          inject: [ConfigurationService],
          useFactory: async (config: ConfigurationService) => ({
            dialect: config.get('POSTGRES_DIALECT'),
            port: config.get('POSTGRES_PORT'),
            host: config.get('POSTGRES_HOST'),
            username: config.get('POSTGRES_USERNAME'),
            password: config.get('POSTGRES_PASSWORD'),
            database: config.get('POSTGRES_DATABASE'),
            // benchmark: true, // this one enables tracking execution time
            // logQueryParameters: true,
            // replication: {
            //   read: [
            //     {
            //       host: config.get('POSTGRES_READ_1_HOST'),
            //     },
            //   ],
            //   write: {
            //     host: config.get('POSTGRES_HOST'),
            //   },
            // },
            pool: {
              max: options.dbPoolMax,
              min: options.dbPoolMin,
              acquire: options.dbPoolAcquire,
              idle: options.dbPoolIdle,
            },
            logging: false,
            models: entities,
          }),
        }),
        SequelizeModule.forFeature(entities),
      ],
      providers: [
        {
          provide: APP_FILTER,
          useClass: AllExceptionFilter,
        },
        ConfigurationService,
        AppLogger,
        LibsDao,
        AssetDao,
        AssetExtraDao,
        CollectionDao,
        SeaportOrderHistoryDao,
        OrderDao,
        MoralisNftApiService,
        AlchemyNftApiService,
        NftscanNftApiService,
        TraitDao,
        LibsService,
        RpcService,
        RpcHandlerService,
        GatewayService,
        CurrencyService,
        ImportCollectionLogService,
        CWLogService,
        LogService,

        EventPollerDao,

        OrderQueueService,
        // CoreConsumer,
        ...providers,
      ],
      exports: [
        ConfigurationService,
        HttpModule,
        AppLogger,
        LibsDao,
        AssetDao,
        AssetExtraDao,
        CollectionDao,
        SeaportOrderHistoryDao,
        TraitDao,
        OrderDao,
        RpcService,
        RpcHandlerService,
        GatewayService,
        CurrencyService,
        ImportCollectionLogService,
        CWLogService,
        LogService,
        MoralisNftApiService,
        AlchemyNftApiService,
        NftscanNftApiService,

        EventPollerDao,

        OrderQueueService,
      ],
    };
  }
}
