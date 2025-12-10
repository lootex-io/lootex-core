// import { QueueService } from '@/common/queue/queue.service';
import { QueueService } from '@/external/queue/queue.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { LibsService } from '@/common/libs/libs.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AccountService } from '@/api/v3/account/account.service';
import { AccountController } from '@/api/v3/account/account.controller';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { ThirdPartyApiModule } from '@/third-party-api/thirdPartyApi.module';
import { StorageModule } from '@/external/storage/storage.module';
import { CacheModule } from '@/common/cache';
import { providers } from '@/model/providers';
import { entities } from '@/model/entities';
import { QueueInterface } from '@/interfaces/queue.interface';
import { mock } from 'jest-mock-extended';

import { TagService } from '../tag/tag.service';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';

describe('AccountController', () => {
  let controller: AccountController;
  const mockQueue = mock<QueueInterface>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register(),
        ThirdPartyApiModule,
        StorageModule,

        TestSequelizeModule.forRootAsync(entities),
        SequelizeModule.forFeature(entities),
      ],
      controllers: [AccountController],
      providers: [
        AccountService,
        AssetService,
        AssetExtraService,
        JwtService,
        TraitService,
        LibsService,
        CollectionService,
        ContractService,
        QueueService,

        TagService,
        {
          provide: 'PUBSUB_QUEUE',
          useValue: mockQueue,
        },
        ...providers,
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
