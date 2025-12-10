import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { entities } from '@/model/entities';
import { providers } from '@/model/providers';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { ConfigurationModule } from '@/configuration';
import { SequelizeModule } from '@nestjs/sequelize';

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletService, ...providers],
      imports: [
        ConfigurationModule,
        TestSequelizeModule.forRootAsync(entities),
        SequelizeModule.forFeature(entities),
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
