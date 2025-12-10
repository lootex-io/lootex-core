import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyService } from './currency.service';
import { ThirdPartyApiModule } from '@/third-party-api/thirdPartyApi.module';
import { CacheModule } from '@nestjs/common';
import { ConfigurationModule } from '@/configuration';
import { CacheService } from '@/common/cache';

describe('CurrencyService', () => {
  let service: CurrencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register(),
        ThirdPartyApiModule,
        ConfigurationModule,
      ],
      providers: [CurrencyService, CacheService],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
