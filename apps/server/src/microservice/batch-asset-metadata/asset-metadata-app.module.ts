import { Module } from '@nestjs/common';
import { BatchAssetMetadataService } from '@/microservice/batch-asset-metadata/batch-asset-metadata.service';
import { ConfigurationService } from '@/configuration';
import { QueueService } from '@/external/queue/queue.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { sequelizeProvider } from '@/model/providers';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { StorageService } from '@/external/storage/storage.service';

@Module({
  imports: [SequelizeModule.forFeature(entities)],
  providers: [
    BatchAssetMetadataService,
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
export class AssetMetadataAppModule {}
