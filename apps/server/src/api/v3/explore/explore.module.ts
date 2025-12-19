import { Module } from '@nestjs/common';
import { ExploreService } from './explore.service';
import { ExploreController } from './explore.controller';
import { AssetService } from '@/api/v3/asset/asset.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { AccountService } from '@/api/v3/account/account.service';
import { providers } from '@/model/providers';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';

import { JwtService } from '@nestjs/jwt';
import { BlockchainService } from '@/external/blockchain';

import { OrderService } from '../order/order.service';

import { ExploreQuestService } from '@/api/v3/explore/explore-quest.service';
import { ExploreCoreService } from '@/api/v3/explore/explore-core.service';
import { ExploreConsumer } from '@/api/v3/explore/proxy/explore.consumer';
import { ExploreDataService } from '@/api/v3/explore/proxy/explore-data.service';
import { ExploreProxyService } from '@/api/v3/explore/proxy/explore-proxy.service';

@Module({
  imports: [SequelizeModule.forFeature(entities)],
  providers: [
    AccountService,
    AssetExtraService,
    AssetService,
    BlockchainService,
    CollectionService,
    ContractService,
    ExploreCoreService,
    ExploreService,
    ExploreQuestService,
    JwtService,
    LibsService,
    OrderService,

    TraitService,

    ExploreConsumer,
    ExploreDataService,
    ExploreProxyService,
    ...providers,
  ],
  controllers: [ExploreController],
})
export class ExploreModule { }
