import { Test, TestingModule } from '@nestjs/testing';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { CacheModule } from '@/common/cache';
import { providers } from '@/model/providers';
import { ThirdPartyApiModule } from '@/third-party-api/thirdPartyApi.module';
import { entities } from '@/model/entities';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';

const libsServiceMock = jest.mock('@/common/libs/libs.service');

describe('CollectionService', () => {
  let service: CollectionService;
  let libsService: LibsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionService,
        ContractService,
        LibsService,
        AssetExtraService,
        ...providers,
      ],
      imports: [
        CacheModule.register(),
        ThirdPartyApiModule,
        TestSequelizeModule.forRootAsync(entities),
        SequelizeModule.forFeature(entities),
      ],
    })
      .overrideProvider(LibsService)
      .useValue(libsServiceMock)
      .compile();

    service = module.get<CollectionService>(CollectionService);
    libsService = module.get<LibsService>(LibsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
