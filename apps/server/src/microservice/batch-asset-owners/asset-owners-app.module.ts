import { Module } from '@nestjs/common';
import { BatchAssetOwnersService } from '@/microservice/batch-asset-owners/batch-asset-owners.service';
import { ConfigurationService } from '@/configuration';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { sequelizeProvider } from '@/model/providers';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';

@Module({
  imports: [SequelizeModule.forFeature(entities)],
  providers: [
    BatchAssetOwnersService,
    ConfigurationService,
    AssetExtraService,
    LibsService,
    CollectionService,
    ContractService,
    sequelizeProvider,
  ],
})
export class AssetOwnersAppModule { }
