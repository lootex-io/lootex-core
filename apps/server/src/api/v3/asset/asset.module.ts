import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetController } from '@/api/v3/asset/asset.controller';
import { AssetService } from '@/api/v3/asset/asset.service';
import { ConfigurationService } from '@/configuration/configuration.service';
import { JwtService } from '@nestjs/jwt';
import { TraitService } from '@/api/v3/trait/trait.service';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { providers } from '@/model/providers';
import { TraitModule } from '@/api/v3/trait/trait.module';
import { entities } from '@/model/entities';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { AssetDataService } from '@/api/v3/asset/proxy/asset-data.service';
import { AssetProxyService } from '@/api/v3/asset/proxy/asset-proxy.service';
import { AssetConsumer } from '@/api/v3/asset/proxy/asset.consumer';

@Module({
  imports: [TraitModule, SequelizeModule.forFeature(entities)],
  controllers: [AssetController],
  providers: [
    AssetService,
    AssetExtraService,
    ConfigurationService,
    ConfigService,
    JwtService,
    TraitService,
    LibsService,
    CollectionService,
    ContractService,
    AssetDataService,
    AssetProxyService,
    AssetConsumer,
    ...providers,
  ],
})
export class AssetModule { }
