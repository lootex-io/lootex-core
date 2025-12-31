import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TraitService } from '@/api/v3/trait/trait.service';
import { BatchCollectionVolumeService } from '@/microservice/batch-collection-volume/batch-collection-volume.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { LibsService } from '@/common/libs/libs.service';
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
    BatchCollectionVolumeService,
    TraitService,
    CollectionService,
    LibsService,
    ContractService,
    AssetExtraService,
    sequelizeProvider,
  ],
})
export class BatchCollectionVolumeModule { }
