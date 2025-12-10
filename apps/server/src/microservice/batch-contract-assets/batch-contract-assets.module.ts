import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BatchContractAssetsService } from '@/microservice/batch-contract-assets/batch-contract-assets.service';
import { ConfigurationService } from '@/configuration';
import { QueueModule } from '@/external/queue/queue.module';
import { QueueService } from '@/external/queue/queue.service';
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
import { StorageService } from '@/external/storage/storage.service';

@Module({
  imports: [
    CoreModule.forRoot(),
    ScheduleModule.forRoot(),
    QueueModule,
    SequelizeModule.forFeature(entities),
  ],
  providers: [
    BatchContractAssetsService,
    ConfigurationService,
    QueueService,
    AssetService,
    AssetExtraService,
    TraitService,
    LibsService,
    CollectionService,
    ContractService,
    StorageService,
    sequelizeProvider,
  ],
})
export class BatchContractAssetsModule {}
