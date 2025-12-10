import { CollectionService } from '@/api/v3/collection/collection.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { JwtService } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { BlockchainService } from '@/external/blockchain';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { providers } from '@/model/providers';
import { CurrencyService } from '@/core/third-party-api/currency/currency.service';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { LibsService } from '@/common/libs/libs.service';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';
import { CacheModule } from '@/common/cache';
import { AccountService } from '../account/account.service';
import { QueueService } from '@/external/queue/queue.service';
import { StorageService } from '@/external/storage/storage.service';
import { SdkApiKeyService } from '@/core/sdk/service/sdk-api-key.service';

@Module({
  imports: [CacheModule, SequelizeModule.forFeature(entities)],
  controllers: [OrderController],
  providers: [
    AssetExtraService,
    AssetService,
    AccountService,
    BlockchainService,
    CollectionService,
    ContractService,
    QueueService,
    CurrencyService,
    GatewayService,
    JwtService,
    LibsService,
    OrderService,
    TraitService,
    StorageService,
    SdkApiKeyService,
    ...providers,
  ],
  exports: [OrderService],
})
export class OrderModule {}
