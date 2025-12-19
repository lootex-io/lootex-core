import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BatchContractAssetsService } from '@/microservice/batch-contract-assets/batch-contract-assets.service';
import { ConfigurationService } from '@/configuration';
import { AssetService } from '@/api/v3/asset/asset.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { sequelizeProvider } from '@/model/providers';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { CoreModule } from '@/core/core.module';

@Module({
  imports: [
    CoreModule.forRoot(),
    ScheduleModule.forRoot(),
    SequelizeModule.forFeature(entities),
  ],
  providers: [
    BatchContractAssetsService,
    ConfigurationService,
    AssetService,
    AssetExtraService,
    TraitService,
    LibsService,
    CollectionService,
    ContractService,
    sequelizeProvider,
  ],
})
export class BatchContractAssetsModule { }
