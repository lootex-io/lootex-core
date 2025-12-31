import { AssetService } from '@/api/v3/asset/asset.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { OrderService } from '@/api/v3/order/order.service';
import { LibsService } from '@/common/libs/libs.service';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';

import { CollectionService } from './collection.service';
import { CollectionController } from './collection.controller';
import { ContractService } from '@/api/v3/contract/contract.service';

import { providers } from '@/model/providers';
import { BlockchainService } from '@/external/blockchain';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';

import { AccountService } from '../account/account.service';
import { CollectionDataService } from '@/api/v3/collection/proxy/collection-data.service';
import { CollectionProxyService } from '@/api/v3/collection/proxy/collection-proxy.service';
import { AuthService } from '../auth/auth.service';



@Module({
  imports: [
    SequelizeModule.forFeature(entities),
    HttpModule,
  ],
  providers: [
    AssetService,
    AssetExtraService,
    AccountService,
    CollectionService,
    ContractService,
    JwtService,
    LibsService,
    OrderService,
    BlockchainService,
    TraitService,

    CollectionDataService,
    CollectionProxyService,
    AuthService,

    ...providers,
  ],
  controllers: [CollectionController],
  exports: [CollectionService],
})
export class CollectionModule { }
