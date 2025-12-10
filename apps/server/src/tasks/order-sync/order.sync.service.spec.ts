import { CacheModule } from '@/common/cache';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from '@/api/v3/order/order.service';
import { OrderModule } from '@/api/v3/order/order.module';
import { OrderTasksService } from './order.sync.service';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { entities } from '@/model/entities';
import { providers } from '@/model/providers';
import { JwtService } from '@nestjs/jwt';
import { BlockchainService } from '@/external/blockchain';
import { TraitModule } from '@/api/v3/trait/trait.module';

const orderServiceMock = jest.mock('@/api/v3/order/order.service');

describe('OrderTasksService', () => {
  let service: OrderTasksService;
  let orderService: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register(),
        OrderModule,
        TraitModule,
        TestSequelizeModule.forRootAsync(entities),
      ],
      providers: [
        OrderTasksService,
        OrderService,
        JwtService,
        BlockchainService,
        ...providers,
      ],
    })
      .overrideProvider(OrderService)
      .useValue(orderServiceMock)
      .compile();

    service = module.get<OrderTasksService>(OrderTasksService);
    orderService = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('CurrencyTasksService.handleCron', async () => {
    orderService.syncExpiredOrders = jest.fn().mockResolvedValue({});
    const updateAllPriceToCacheByMulticall = jest.spyOn(
      orderService,
      'syncExpiredOrders',
    );
    await service.handleCron();
    expect(updateAllPriceToCacheByMulticall).toHaveBeenCalled();
  });
});
