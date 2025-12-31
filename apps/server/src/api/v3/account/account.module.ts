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
import { AccountService } from '@/api/v3/account/account.service';
import { AccountController } from '@/api/v3/account/account.controller';
import { providers } from '@/model/providers';

import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthService } from '../auth/auth.service';
import { OrderService } from '../order/order.service';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    SequelizeModule.forFeature(entities),
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

    OrderService,

    ...providers,
  ],
  controllers: [AccountController],
})
export class AccountModule { }
