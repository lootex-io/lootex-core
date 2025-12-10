import { ContractService } from '@/api/v3/contract/contract.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { LibsService } from '@/common/libs/libs.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { BlockchainService } from '@/external/blockchain';
import { AssetService } from '@/api/v3/asset/asset.service';
import { ConfigService } from '@nestjs/config';
import { ConfigurationService } from '@/configuration';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StorageModule } from '@/external/storage/storage.module';
import { AccountService } from '@/api/v3/account/account.service';
import { AccountController } from '@/api/v3/account/account.controller';
import { providers } from '@/model/providers';
import { QueueService } from '@/external/queue/queue.service';

import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthService } from '../auth/auth.service';
import { SendInBlueModule } from '@/external/send-in-blue/send-in-blue.module';
import { OrderService } from '../order/order.service';
import { CurrencyService } from '../currency/currency.service';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    StorageModule,
    SequelizeModule.forFeature(entities),
    SendInBlueModule,
    AuthModule,
  ],
  providers: [
    AccountService,
    AuthService,
    JwtService,
    ConfigService,
    ConfigurationService,
    AssetService,
    AssetExtraService,
    BlockchainService,
    TraitService,
    LibsService,
    CollectionService,
    ContractService,
    QueueService,

    OrderService,
    CurrencyService,

    ...providers,
  ],
  controllers: [AccountController],
})
export class AccountModule {}
