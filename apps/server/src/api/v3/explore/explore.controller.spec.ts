import { Test, TestingModule } from '@nestjs/testing';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { ExploreController } from './explore.controller';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@/common/cache';
import { AssetService } from '@/api/v3/asset/asset.service';
import { ThirdPartyApiModule } from '@/third-party-api/thirdPartyApi.module';
import { TraitService } from '@/api/v3/trait/trait.service';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { AccountService } from '@/api/v3/account/account.service';
import { providers } from '@/model/providers';
import { entities } from '@/model/entities';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';

describe('ExploreController', () => {
  let controller: ExploreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        HttpModule,
        ThirdPartyApiModule,
        CacheModule.register(),
        TestSequelizeModule.forRootAsync(entities),
        SequelizeModule.forFeature(entities),
      ],
      controllers: [ExploreController],
      providers: [
        AssetService,
        AssetExtraService,
        TraitService,
        LibsService,
        CollectionService,
        ContractService,
        AccountService,
        ...providers,
      ],
    }).compile();

    controller = module.get<ExploreController>(ExploreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
