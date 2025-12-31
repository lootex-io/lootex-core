import { CurrencyService as ThirdPartyCurrencyService } from '@/core/third-party-api/currency/currency.service';
import { HealthModule } from '@/common/health/health.module';
import { ConfigurationService } from '@/configuration';
import { sequelizeProvider } from '@/model/providers';
import { Module } from '@nestjs/common';
import { EventPollerService } from './event-poller.service';
import { ScheduleModule } from '@nestjs/schedule';
import { SequelizeModule } from '@nestjs/sequelize';
import { LibsService } from '@/common/libs/libs.service';
import { entities } from '@/model/entities';
import { CoreModule } from '@/core/core.module';
import { BlockchainService } from '@/external/blockchain';
import { AssetService } from '@/api/v3/asset/asset.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { EventPollerHandlerService } from '@/microservice/event-poller/service/event-poller-handler.service';
import { OrderService } from '@/api/v3/order/order.service';
import { EventPollerWsService } from '@/microservice/event-poller/service/event-poller-ws.service';
import { EventPollerRpcService } from '@/microservice/event-poller/service/event-poller-rpc.service';
import { AccountService } from '@/api/v3/account/account.service';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';

@Module({
  imports: [
    CoreModule.forRoot(),
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
    ScheduleModule.forRoot(),
    SequelizeModule.forFeature(entities),
  ],
  controllers: [],
  providers: [
    LibsService,
    AssetService,
    AssetExtraService,
    AccountService,
    TraitService,
    EventPollerService,
    EventPollerWsService,
    ConfigurationService,
    CollectionService,
    ContractService,
    OrderService,
    BlockchainService,
    EventPollerHandlerService,
    EventPollerRpcService,
    ThirdPartyCurrencyService,
    GatewayService,
    sequelizeProvider,
  ],
})
export class EventPollerModule { }
