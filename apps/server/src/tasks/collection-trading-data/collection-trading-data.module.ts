import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { CollectionModule } from '@/api/v3/collection/collection.module';
import { sequelizeProvider } from '@/model/providers';
import { ContractService } from '@/api/v3/contract/contract.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { JwtService } from '@nestjs/jwt';
import { OrderService } from '@/api/v3/order/order.service';
import { BlockchainService } from '@/external/blockchain';
import { AccountService } from '@/api/v3/account/account.service';
import { CoreModule } from '@/core/core.module';
import { TraitService } from '@/api/v3/trait/trait.service';
import { CollectionTradingDataService } from './collection-trading-data.service';

@Module({
  imports: [
    CoreModule.forRoot(),
    ScheduleModule.forRoot(),
    CollectionModule,
    SequelizeModule.forFeature(entities),
  ],
  providers: [
    CollectionTradingDataService,
    AssetService,
    AssetExtraService,
    AccountService,
    CollectionService,
    BlockchainService,
    TraitService,
    sequelizeProvider,
  ],
})
export class TasksModule { }
