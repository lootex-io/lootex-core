import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyService } from './currency.service';
import { CacheModule, CacheService } from '@/common/cache';

const cacheMock = jest.mock('@/common/cache/cache.service');

describe('CurrencyService', () => {
  let service: CurrencyService;
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [CurrencyService, CacheService],
    })
      .overrideProvider(CacheService)
      .useValue(cacheMock)
      .compile();

    service = module.get<CurrencyService>(CurrencyService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('service.updateAllPriceToCacheByMulticall()', async () => {
    const symbol = 'ETH';
    const price = 1000;
    cacheService.setCache = jest.fn().mockResolvedValue({
      symbol,
      price,
    });
    cacheService.getCache = jest.fn().mockResolvedValue({
      symbol,
      price,
    });
    const setCache = jest.spyOn(cacheService, 'setCache');
    const getCache = jest.spyOn(cacheService, 'getCache');
    await service.updateAllPriceToCacheByMulticall();
    expect(getCache).toHaveBeenCalled();
    expect(setCache).toHaveBeenCalled();
  });

  it('service.getSymbolPrice()', async () => {
    const symbol = 'BTCUSD';
    const price = 10000;
    cacheService.getCache = jest.fn().mockResolvedValue({
      symbol,
      price,
    });
    const getCache = jest.spyOn(cacheService, 'getCache');
    const priceInfo = await service.getSymbolPrice(symbol);
    expect(priceInfo.symbol).toEqual(symbol);
    expect(priceInfo.price).toEqual(price);
    expect(getCache).toHaveBeenCalled();
  });
});
