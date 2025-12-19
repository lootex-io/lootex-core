import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyTasksService } from '@/microservice/currency-price/currency.price.service';
import { CurrencyService } from '@/third-party-api/currency/currency.service';
import { CacheModule } from '@/common/cache';

const CurrencyServiceMock = jest.mock(
  '@/third-party-api/currency/currency.service',
);

describe('CurrencyTasksService', () => {
  let service: CurrencyTasksService;
  let currencyService: CurrencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [CurrencyTasksService, CurrencyService],
    })
      .overrideProvider(CurrencyService)
      .useValue(CurrencyServiceMock)
      .compile();

    service = module.get<CurrencyTasksService>(CurrencyTasksService);
    currencyService = module.get<CurrencyService>(CurrencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('CurrencyTasksService.handleTimeout', async () => {
    currencyService.updateAllPriceToCacheByMulticall = jest
      .fn()
      .mockResolvedValue({});
    const updateAllPriceToCacheByMulticall = jest.spyOn(
      currencyService,
      'updateAllPriceToCacheByMulticall',
    );
    await service.handleTimeout();
    expect(updateAllPriceToCacheByMulticall).toHaveBeenCalled();
  });

  it('CurrencyTasksService.handleCron', async () => {
    currencyService.updateAllPriceToCacheByMulticall = jest
      .fn()
      .mockResolvedValue({});
    const updateAllPriceToCacheByMulticall = jest.spyOn(
      currencyService,
      'updateAllPriceToCacheByMulticall',
    );
    await service.handleCron();
    expect(updateAllPriceToCacheByMulticall).toHaveBeenCalled();
  });
});
