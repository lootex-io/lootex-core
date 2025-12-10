import { AssetService } from '@/api/v3/asset/asset.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './account.service';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { entities } from '@/model/entities';
import { providers } from '@/model/providers';
import { TraitService } from '../trait/trait.service';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '../collection/collection.service';
import { ContractService } from '../contract/contract.service';
import { ThirdPartyApiModule } from '@/third-party-api/thirdPartyApi.module';
import { CacheModule } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QueueInterface } from '@/interfaces';
import { HttpModule } from '@nestjs/axios';

import { TagService } from '../tag/tag.service';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';

describe('AccountService', () => {
  let service: AccountService;
  const mockQueue = mock<QueueInterface>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register(),
        ThirdPartyApiModule,
        HttpModule,
        TestSequelizeModule.forRootAsync(entities),
        SequelizeModule.forFeature(entities),
      ],
      providers: [
        AccountService,
        AssetService,
        AssetExtraService,
        TraitService,
        LibsService,
        CollectionService,
        ContractService,

        TagService,
        {
          provide: 'PUBSUB_QUEUE',
          useValue: mockQueue,
        },
        ...providers,
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
