import { AssetService } from '@/api/v3/asset/asset.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { BlockchainService } from '@/external/blockchain/blockchain.service';
import { OrderService } from '@/api/v3/order/order.service';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { CollectionController } from '@/api/v3/collection/collection.controller';

import { CollectionService } from '@/api/v3/collection/collection.service';
import { ContractService } from '@/api/v3/contract/contract.service';
// import { QueueService } from '@/common/queue/queue.service';
import { QueueService } from '@/external/queue/queue.service';
import { LibsService } from '@/common/libs/libs.service';

import { StorageModule } from '@/external/storage/storage.module';
import { CacheModule } from '@/common/cache';
import { providers } from '@/model/providers';
import { ThirdPartyApiModule } from '@/third-party-api/thirdPartyApi.module';
import { entities } from '@/model/entities';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';

jest.mock('@/common/queue/queue.service');
const libsServiceMock = jest.mock('@/common/libs/libs.service');

describe('CollectionController', () => {
  let controller: CollectionController;
  let libsService: LibsService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtService,
        CollectionService,
        ContractService,
        QueueService,
        ConfigService,
        LibsService,
        OrderService,
        BlockchainService,
        TraitService,
        AssetService,
        AssetExtraService,
        ...providers,
      ],
      controllers: [CollectionController],
      imports: [
        CacheModule.register(),
        StorageModule,
        ThirdPartyApiModule,
        TestSequelizeModule.forRootAsync(entities),
        SequelizeModule.forFeature(entities),
      ],
    })
      .overrideProvider(LibsService)
      .useValue(libsServiceMock)
      .compile();

    controller = module.get<CollectionController>(CollectionController);
    libsService = module.get<LibsService>(LibsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
