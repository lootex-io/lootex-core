import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from './wallet.controller';
import { WalletService } from '@/api/v3/wallet/wallet.service';
import { providers } from '@/model/providers';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { entities } from '@/model/entities';
import { ConfigurationModule } from '@/configuration';
import { SequelizeModule } from '@nestjs/sequelize';

describe('WalletController', () => {
  let controller: WalletController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [WalletService, ...providers],
      imports: [
        ConfigurationModule,
        TestSequelizeModule.forRootAsync(entities),
        SequelizeModule.forFeature(entities),
      ],
    }).compile();

    controller = module.get<WalletController>(WalletController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
