import { LibsService } from '@/common/libs/libs.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { Module } from '@nestjs/common';

import { AssetService } from '@/api/v3/asset/asset.service';
import { ContractController } from '@/api/v3/contract/contract.controller';
import { ContractService } from '@/api/v3/contract/contract.service';
import { ConfigurationService } from '@/configuration/configuration.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { providers } from '@/model/providers';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { entities } from '@/model/entities';
import { SequelizeModule } from '@nestjs/sequelize';


@Module({
  imports: [SequelizeModule.forFeature(entities)],
  controllers: [ContractController],
  providers: [
    AssetService,
    AssetExtraService,
    ContractService,
    ConfigurationService,
    TraitService,
    LibsService,
    CollectionService,

    ...providers,
  ],
})
export class ContractModule { }
