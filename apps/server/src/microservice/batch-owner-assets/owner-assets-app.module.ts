import { Module } from '@nestjs/common';
import { BatchOwnerAssetsService } from '@/microservice/batch-owner-assets/batch-owner-assets.service';

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

@Module({
  imports: [SequelizeModule.forFeature(entities)],
  providers: [
    BatchOwnerAssetsService,
    ConfigurationService,
    ContractService,
    sequelizeProvider,
  ],
})
export class OwnerAssetsAppModule { }
