import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { LibsService } from './libs.service';

import { blockchainProvider } from '@/model/providers';
import { Blockchain, entities } from '@/model/entities';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { ConfigurationModule, ConfigurationService } from '@/configuration';
import { SequelizeModule } from '@nestjs/sequelize';

const httpServiceMock = jest.mock('@nestjs/axios');

describe('LibsService', () => {
  let service: LibsService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibsService,
        HttpService,
        ConfigurationService,
        blockchainProvider,
      ],
      imports: [
        ConfigurationModule,
        TestSequelizeModule.forRootAsync([Blockchain]),
        SequelizeModule.forFeature(entities),
      ],
    })
      .overrideProvider(HttpService)
      .useValue(httpServiceMock)
      .compile();

    service = module.get<LibsService>(LibsService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
