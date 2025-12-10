import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from '@/api/v3/currency/currency.service';
import { ThirdPartyApiModule } from '@/third-party-api/thirdPartyApi.module';
import { CacheModule } from '@/common/cache';

describe('CurrencyController', () => {
  let controller: CurrencyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register(), ThirdPartyApiModule],
      providers: [CurrencyService],
      controllers: [CurrencyController],
    }).compile();

    controller = module.get<CurrencyController>(CurrencyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
