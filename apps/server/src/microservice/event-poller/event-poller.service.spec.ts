import { CacheModule } from '@/common/cache';
import { Test, TestingModule } from '@nestjs/testing';
import {
  Account,
  Wallet,
  AssetAsEthAccount,
  EthAccount,
  Contract,
  Blockchain,
  SeaportOrder,
  SeaportOrderAsset,
  SeaportOrderHistory,
  Currency,
  Collection,
  PollerProgress,
  entities,
} from '@/model/entities';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { seeder } from '@/../test/utils/seeder';
import { EventPollerService } from './event-poller.service';
import { HealthModule } from '@/common/health/health.module';
import { ConfigurationModule, ConfigurationService } from '@/configuration';
import { providers } from '@/model/providers';
import { ScheduleModule } from '@nestjs/schedule';
import { Category, ReceivedItem } from '@/api/v3/order/order.interface';
import { BigNumber, ethers } from 'ethers';
import {
  ORDER_FULFILLED_SIGNATURE,
  ORDER_CANCELLED_SIGNATURE,
  ORDER_VALIDATED_SIGNATURE,
  COUNTER_INCREMENTED_SIGNATURE,
} from './constants';
import { SequelizeModule } from '@nestjs/sequelize';
import { CurrencyService } from '@/api/v3/currency/currency.service';

const ETH_PROGRESS = {
  chainName: 'ETHEREUM',
  chainId: 1,
  lastPolledBlock: 14946474, // https://etherscan.io/tx/0x34a28a0111a238347fe30a6c91b00437f8438357427c5e759a2f7577afe65144
};

const ORDER1_UUID = '9173ebf6-7927-41c1-bea2-8eae3353c8a8';
const ORDER1_OFFERER = '0xb14c95d1844d5d8b00166e46338f5fc9546df9d5';
const ORDER1_FULFILLER = '0xaaaaa5d1844d5d8b00166e46338f5fc9546df9d5';
const ORDER1_OFFER = [
  {
    itemType: 2,
    token: '0xeB3a9A839dFeEaf71db1B4eD6a8ae0cCB171b227',
    identifierOrCriteria: '4131',
    startAmount: '1',
    endAmount: '1',
  },
];
const ORDER1_SPENT = [
  {
    itemType: 2,
    token: '0xeB3a9A839dFeEaf71db1B4eD6a8ae0cCB171b227',
    identifier: BigNumber.from('4131'),
    amount: BigNumber.from('1'),
  },
];
const ORDER1_RECEIVE: ReceivedItem[] = [
  {
    itemType: 0,
    token: '0x0000000000000000000000000000000000000000',
    identifier: BigNumber.from('0'),
    amount: BigNumber.from('887550000000000000'),
    recipient: '0xb14c95D1844D5d8B00166e46338F5Fc9546DF9D5',
  },
  {
    itemType: 0,
    token: '0x0000000000000000000000000000000000000000',
    identifier: BigNumber.from('0'),
    amount: BigNumber.from('24250000000000000'),
    recipient: '0x0000a26b00c1F0DF003000390027140000fAa719',
  },
  {
    itemType: 0,
    token: '0x0000000000000000000000000000000000000000',
    identifier: BigNumber.from('0'),
    amount: BigNumber.from('58200000000000000'),
    recipient: '0xB75afBa91d6BEfc8B2ee739270827Fd9C5714CfB',
  },
];
const ORDER1_CONSIDERATION = [
  {
    itemType: 0,
    token: '0x0000000000000000000000000000000000000000',
    identifierOrCriteria: '0',
    startAmount: '887550000000000000',
    endAmount: '887550000000000000',
    recipient: '0xb14c95D1844D5d8B00166e46338F5Fc9546DF9D5',
  },
  {
    itemType: 0,
    token: '0x0000000000000000000000000000000000000000',
    identifierOrCriteria: '0',
    startAmount: '24250000000000000',
    endAmount: '24250000000000000',
    recipient: '0x0000a26b00c1F0DF003000390027140000fAa719',
  },
  {
    itemType: 0,
    token: '0x0000000000000000000000000000000000000000',
    identifierOrCriteria: '0',
    startAmount: '58200000000000000',
    endAmount: '58200000000000000',
    recipient: '0xB75afBa91d6BEfc8B2ee739270827Fd9C5714CfB',
  },
];
const ORDER1_SIGNATURE =
  '0xb79fb957b98cdc68beb7363873c2f908020747b9df79545d2920f982b2c15f3570ff3da346721016a129b774450053017ad2c55b9ed37857d4658001716a47931b';
const ORDER1_HASH =
  '0x7daa628a16d234e4303a7828d8c1975498e2f7a8d7ff8f650e5e625188ddf801';
const ORDER1_CATEGORY = Category.LISTING;
const ORDER1_TYPE = 2;
const ORDER1_STARTTIME = 1667807014;
const ORDER1_ENDTIME = 1670399014;
const ORDER1_TOTALCONSIDERATION = 3;
const ORDER1_ZONE = '0x004C00500000aD104D7DBd00e3ae0A5C00560C00';
const ORDER1_ZONEHASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const ORDER1_COUNTER = '0';
const ORDER1_CONDUIT_KEY =
  '0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000';
const ORDER1_SALT =
  '0x360c6ebe000000000000000000000000000000000000000081700c7a349d2553';
const ORDER1_EXCHANGE_ADDRESS = '0x00000000006c3852cbef3e08e8df289169ede581';
const ORDER1_CHAINID = '1';
const ORDER1_PRICE = 0.97;

const order1 = {
  id: ORDER1_UUID,
  offerer: ORDER1_OFFERER,
  offer: ORDER1_OFFER,
  consideration: ORDER1_CONSIDERATION,
  signature: ORDER1_SIGNATURE,
  hash: ORDER1_HASH,
  category: ORDER1_CATEGORY,
  orderType: ORDER1_TYPE,
  startTime: ORDER1_STARTTIME,
  endTime: ORDER1_ENDTIME,
  totalOriginalConsiderationItems: ORDER1_TOTALCONSIDERATION,
  zone: ORDER1_ZONE,
  zoneHash: ORDER1_ZONEHASH,
  counter: ORDER1_COUNTER,
  conduitKey: ORDER1_CONDUIT_KEY,
  salt: ORDER1_SALT,
  exchangeAddress: ORDER1_EXCHANGE_ADDRESS,
  chainId: ORDER1_CHAINID,
  price: ORDER1_PRICE,
};

const ORDER2_UUID = '52231b95-a185-4747-8e11-d343677d0fec';
const ORDER2_HASH = '0x2';
const order2 = {
  id: ORDER2_UUID,
  offerer: ORDER1_OFFERER,
  offer: ORDER1_OFFER,
  consideration: ORDER1_CONSIDERATION,
  signature: ORDER1_SIGNATURE,
  hash: ORDER2_HASH,
  category: ORDER1_CATEGORY,
  orderType: ORDER1_TYPE,
  startTime: ORDER1_STARTTIME,
  endTime: ORDER1_ENDTIME,
  totalOriginalConsiderationItems: ORDER1_TOTALCONSIDERATION,
  zone: ORDER1_ZONE,
  zoneHash: ORDER1_ZONEHASH,
  counter: ORDER1_COUNTER,
  conduitKey: ORDER1_CONDUIT_KEY,
  salt: ORDER1_SALT,
  exchangeAddress: ORDER1_EXCHANGE_ADDRESS,
  chainId: ORDER1_CHAINID,
};

const EVM_CHAIN_NUMBER = 8;

// const FAKE_CHAIN_ID = 1;
// const FAKE_RPC_ENDPOINT = 'https://rpc.ankr.com/eth';
// const FAKE_SEAPORT_ADDRESS = '0x00000000006c3852cbEf3e08E8dF289169EdE5810x8787';
// const FAKE_POLLING_BATCH = 10;

const FAKE_CHAIN_ID = Number(order1.chainId);
const FAKE_RPC_ENDPOINT = '87';
const FAKE_SEAPORT_ADDRESS = '87';
const FAKE_POLLING_BATCH = 10;
const FAKE_RETRY_LIMIT = 3;
const FAKE_RETRY_CNT = 0;

const orderFulfilledEvent1 = {
  address: '0x00000000006c3852cbEf3e08E8dF289169EdE581',
  data:
    order1.hash +
    '0000000000000000000000005b4dbf2ee55930c9389eadda0f1fac899f8f1bb40000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011c37937e080000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000200000000000000000000000076d22b0021b8e8fdf3a055ff0ae0a965b0e722550000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000094347f833837f58a5746227c45d86572c46d8e690000000000000000000000000000000000000000000000000000000000000001000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000071afd498d0000000000000000000000000000000a26b00c1f0df003000390027140000faa7190000000000000000000000000000000000000000000000000000000000000001000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001c6bf5263400000000000000000000000000076d22b0021b8e8fdf3a055ff0ae0a965b0e72255',
  topics: [
    ethers.utils.id(ORDER_FULFILLED_SIGNATURE),
    ethers.utils.hexZeroPad(order1.offerer, 32),
    ethers.utils.hexZeroPad(order1.zone, 32),
  ],
};

const orderCancelledEvent1 = {
  address: '0x00000000006c3852cbEf3e08E8dF289169EdE581',
  data: order1.hash,
  topics: [
    ethers.utils.id(ORDER_CANCELLED_SIGNATURE),
    ethers.utils.hexZeroPad(order1.offerer, 32),
    ethers.utils.hexZeroPad(order1.zone, 32),
  ],
};

const orderValidatedEvent1 = {
  address: '0x00000000006c3852cbEf3e08E8dF289169EdE581',
  data: order1.hash,
  topics: [
    ethers.utils.id(ORDER_VALIDATED_SIGNATURE),
    ethers.utils.hexZeroPad(order1.offerer, 32),
    ethers.utils.hexZeroPad(order1.zone, 32),
  ],
};

const counterIncrementedEvent1 = {
  address: '0x00000000006c3852cbEf3e08E8dF289169EdE581',
  data: ethers.utils.hexZeroPad('0x87', 32),
  topics: [
    ethers.utils.id(COUNTER_INCREMENTED_SIGNATURE),
    ethers.utils.hexZeroPad(order1.offerer, 32),
  ],
};

describe('EventPollerService', () => {
  let service: EventPollerService;
  let currencyService: CurrencyService;

  async function cleanup() {
    await Account.destroy({ truncate: true, cascade: true });
    await Wallet.destroy({ truncate: true, cascade: true });
    await AssetAsEthAccount.destroy({ truncate: true, cascade: true });
    await EthAccount.destroy({ truncate: true, cascade: true });
    await Contract.destroy({ truncate: true, cascade: true });
    await Blockchain.destroy({ truncate: true, cascade: true });
    await SeaportOrder.destroy({ truncate: true, cascade: true });
    await SeaportOrderAsset.destroy({ truncate: true, cascade: true });
    await SeaportOrderHistory.destroy({ truncate: true, cascade: true });
    await Currency.destroy({ truncate: true, cascade: true });
    await Collection.destroy({ truncate: true, cascade: true });
    await PollerProgress.destroy({ truncate: true, cascade: true });
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register(),
        ConfigurationModule,
        HealthModule.forRootAsync({
          inject: [ConfigurationService],
          useFactory: async (config: ConfigurationService) => ({
            db: {
              enabled: true,
            },
            redis: {
              enabled: true,
              host: config.get('REDIS_HOST'),
              port: config.get('REDIS_PORT'),
              password: config.get('REDIS_PASSWORD'),
            },
          }),
        }),
        ScheduleModule.forRoot(),
        TestSequelizeModule.forRootAsync(entities),
        SequelizeModule.forFeature(entities),
      ],
      controllers: [],
      providers: [
        EventPollerService,
        ConfigurationService,
        CurrencyService,
        ...providers,
      ],
    }).compile();

    service = module.get<EventPollerService>(EventPollerService);
    currencyService = module.get<CurrencyService>(CurrencyService);

    await cleanup();

    await seeder.down({ to: 0 as const });
    await seeder.up();

    await SeaportOrder.create(order1);
    await SeaportOrder.create(order2);

    await PollerProgress.create(ETH_PROGRESS);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateFulfilledOrder()', () => {
    it('should update fulfilled order', async () => {
      await service.updateFulfilledOrder(
        order1.hash,
        order1.offerer,
        Number(order1.chainId),
      );
      const order1InDB = await SeaportOrder.findOne({
        where: {
          hash: order1.hash,
        },
      });
      expect(order1InDB.isFillable).toBe(false);
    });
  });

  describe('updateCancelledOrder()', () => {
    it('should update cancelled order', async () => {
      await service.updateCancelledOrder(
        order1.hash,
        order1.offerer,
        Number(order1.chainId),
      );
      const order1InDB = await SeaportOrder.findOne({
        where: {
          hash: order1.hash,
        },
      });
      expect(order1InDB.isCancelled).toBe(true);
    });
  });

  describe('updateValidatedOrder()', () => {
    it('should update validated order', async () => {
      await service.updateValidatedOrder(
        order1.hash,
        order1.offerer,
        Number(order1.chainId),
      );
      const order1InDB = await SeaportOrder.findOne({
        where: {
          hash: order1.hash,
        },
      });
      expect(order1InDB.isValidated).toBe(true);
    });
  });

  describe('updateAllCancelledOrder()', () => {
    it('should update all cancelled order', async () => {
      await service.updateAllCancelledOrder(
        order1.offerer,
        Number(order1.chainId),
      );
      const order1InDB = await SeaportOrder.findOne({
        where: {
          hash: order1.hash,
        },
      });
      const order2InDB = await SeaportOrder.findOne({
        where: {
          hash: order2.hash,
        },
      });
      expect(order1InDB.isCancelled).toBe(true);
      expect(order2InDB.isCancelled).toBe(true);
    });
  });

  describe('saveProgress()', () => {
    it('should save progress', async () => {
      const mockLastPolledBlock = 8787;
      await service.saveProgress(Number(order1.chainId), mockLastPolledBlock);
      const progressInDB = await PollerProgress.findOne({
        where: {
          chainId: order1.chainId,
        },
      });
      expect(progressInDB.lastPolledBlock).toBe(mockLastPolledBlock);
    });
  });

  describe('setRetryTask()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout');
      jest.spyOn(service, 'evmPoll');
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should set a timeout task', () => {
      const retryTaskName = 'testRetryTask';
      service.setRetryTask(
        retryTaskName,
        FAKE_CHAIN_ID,
        FAKE_RPC_ENDPOINT,
        FAKE_SEAPORT_ADDRESS,
        FAKE_POLLING_BATCH,
        FAKE_RETRY_LIMIT,
        FAKE_RETRY_CNT,
      );
      expect(setTimeout).toBeCalledTimes(1);
      expect(jest.getTimerCount()).toBe(1);
    });
  });

  describe('setEvmPollTasks()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setInterval');
      jest.spyOn(global, 'setTimeout');
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should set all EVM chain polling tasks', () => {
      service.setEvmPollTasks();
      expect(setInterval).toHaveBeenCalledTimes(EVM_CHAIN_NUMBER);
      expect(jest.getTimerCount()).toBe(EVM_CHAIN_NUMBER);
    });
  });

  describe('clearAllEvmPollTasks()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setInterval');
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should clear all EVM chain polling tasks', () => {
      service.setEvmPollTasks();
      const timerCountAdded = jest.getTimerCount();
      service.clearAllEvmPollTasks();
      const timerCountDeleted = jest.getTimerCount();
      expect(timerCountAdded).toBeGreaterThan(timerCountDeleted);
      expect(timerCountDeleted).toBe(0);
    });
  });

  describe('clearAllRetryTasks()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setTimeout');
    });

    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should clear all retry tasks', () => {
      const retryTaskName = 'retryTaskName';
      service.setRetryTask(
        retryTaskName,
        FAKE_CHAIN_ID,
        FAKE_RPC_ENDPOINT,
        FAKE_SEAPORT_ADDRESS,
        FAKE_POLLING_BATCH,
        FAKE_RETRY_LIMIT,
        FAKE_RETRY_CNT,
      );
      const timerCountAdded = jest.getTimerCount();
      service.clearAllRetryTasks();
      const timerCountDeleted = jest.getTimerCount();
      expect(timerCountAdded).toBeGreaterThan(timerCountDeleted);
      expect(timerCountDeleted).toBe(0);
    });
  });

  describe('evmPoll()', () => {
    describe('getLatestBlockNumber()', () => {
      beforeEach(() => {
        jest.spyOn(service, 'setRetryTask').mockReturnValue();
        jest.mock('ethers');
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should retry when fails to call', async () => {
        service.getLatestBlockNumber = jest.fn().mockRejectedValue('Error');

        expect(
          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          ),
        ).toBe(false);

        expect(service.setRetryTask).toBeCalledTimes(1);
      });

      it('should return false when returns 0', async () => {
        service.getLatestBlockNumber = jest.fn().mockResolvedValue(0);

        expect(
          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          ),
        ).toBe(false);
      });

      it('should return false when returns undefined', async () => {
        service.getLatestBlockNumber = jest.fn().mockResolvedValue(undefined);

        expect(
          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          ),
        ).toBe(false);
      });
    });

    describe('getLastPolledBlockNumber()', () => {
      beforeEach(() => {
        const mockLatestBlockNumber = 999999999;
        jest.spyOn(service, 'setRetryTask').mockReturnValue();
        service.getLatestBlockNumber = jest
          .fn()
          .mockResolvedValue(mockLatestBlockNumber);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should retry when fails to call', async () => {
        service.getLastPolledBlockNumber = jest.fn().mockRejectedValue('Error');

        expect(
          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          ),
        ).toBe(false);

        expect(service.setRetryTask).toBeCalledTimes(1);
      });
      it('should fail when returns 0', async () => {
        service.getLastPolledBlockNumber = jest.fn().mockResolvedValue(0);

        expect(
          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          ),
        ).toBe(false);
      });
      it('should fail when returns undefined', async () => {
        service.getLastPolledBlockNumber = jest
          .fn()
          .mockResolvedValue(undefined);

        expect(
          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          ),
        ).toBe(false);
      });
    });

    describe('getEvents()', () => {
      beforeEach(() => {
        const mockLatestBlockNumber = 999999999;
        jest.spyOn(service, 'setRetryTask').mockReturnValue();
        service.getLatestBlockNumber = jest
          .fn()
          .mockResolvedValue(mockLatestBlockNumber);
        service.getLastPolledBlockNumber = jest.fn().mockResolvedValue(100);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should retry when fails to call', async () => {
        service.getEvents = jest.fn().mockRejectedValue('Error');

        expect(
          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          ),
        ).toBe(false);

        expect(service.setRetryTask).toBeCalledTimes(1);
      });
    });

    describe('when parsing events', () => {
      describe('when there is no event to parse', () => {
        const mockLastPolledBlock = 5678;
        // make sure latest block > last polled block
        const mockLatestBlockNumber =
          mockLastPolledBlock + FAKE_POLLING_BATCH * 10;

        beforeEach(() => {
          jest.spyOn(service, 'setRetryTask').mockReturnValue();
          service.getLatestBlockNumber = jest
            .fn()
            .mockResolvedValue(mockLatestBlockNumber);
          service.getLastPolledBlockNumber = jest
            .fn()
            .mockResolvedValue(mockLastPolledBlock);
          service.getEvents = jest.fn().mockResolvedValue([]);
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });
        it('should save progress', async () => {
          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          );

          const progressInDB = await PollerProgress.findOne({
            where: {
              chainId: order1.chainId,
            },
          });
          const lastFromBlock = mockLastPolledBlock + 1;
          expect(progressInDB.lastPolledBlock).toBe(
            lastFromBlock + FAKE_POLLING_BATCH,
          );
        });
      });
      describe('when there are events to parse', () => {
        const mockLastPolledBlock = 1234;
        const mockLatestBlockNumber =
          mockLastPolledBlock + FAKE_POLLING_BATCH * 10;
        beforeEach(async () => {
          jest.spyOn(service, 'setRetryTask').mockReturnValue();
          service.getLatestBlockNumber = jest
            .fn()
            .mockResolvedValue(mockLatestBlockNumber);
          service.getLastPolledBlockNumber = jest
            .fn()
            .mockResolvedValue(mockLastPolledBlock);
        });

        afterEach(() => {
          jest.restoreAllMocks();
        });

        it('should update is_fillable when OrderFulfilled', async () => {
          service.getEvents = jest
            .fn()
            .mockResolvedValue([orderFulfilledEvent1]);

          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          );
          const order1InDB = await SeaportOrder.findOne({
            where: {
              hash: order1.hash,
              offerer: order1.offerer,
              chainId: Number(order1.chainId),
            },
          });
          expect(order1InDB.isFillable).toBe(false);
        });

        it('should retry when updateFulfilledOrder() goes wrong', async () => {
          service.updateFulfilledOrder = jest.fn().mockRejectedValue('Error');

          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          );

          expect(service.setRetryTask).toBeCalledTimes(1);
        });

        it('should update is_cancelled when OrderCancelled', async () => {
          service.getEvents = jest
            .fn()
            .mockResolvedValue([orderCancelledEvent1]);

          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          );

          const order1InDB = await SeaportOrder.findOne({
            where: {
              hash: order1.hash,
              offerer: order1.offerer,
              chainId: Number(order1.chainId),
            },
          });
          expect(order1InDB.isCancelled).toBe(true);
        });

        it('should retry when updateCancelledOrder() goes wrong', async () => {
          service.updateCancelledOrder = jest.fn().mockRejectedValue('Error');

          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          );

          expect(service.setRetryTask).toBeCalledTimes(1);
        });

        it('should update is_validated when OrderValidated', async () => {
          service.getEvents = jest
            .fn()
            .mockResolvedValue([orderValidatedEvent1]);

          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          );

          const order1InDB = await SeaportOrder.findOne({
            where: {
              hash: order1.hash,
              offerer: order1.offerer,
              chainId: Number(order1.chainId),
            },
          });
          expect(order1InDB.isValidated).toBe(true);
        });

        it('should retry when updateValidatedOrder() goes wrong', async () => {
          service.updateValidatedOrder = jest.fn().mockRejectedValue('Error');

          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          );

          expect(service.setRetryTask).toBeCalledTimes(1);
        });

        it("should update is_cancelled of the offerer's order when CounterIncremented", async () => {
          service.getEvents = jest
            .fn()
            .mockResolvedValue([counterIncrementedEvent1]);

          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          );

          const order1InDB = await SeaportOrder.findOne({
            where: {
              hash: order1.hash,
              offerer: order1.offerer,
              chainId: Number(order1.chainId),
            },
          });

          const order2InDB = await SeaportOrder.findOne({
            where: {
              hash: order2.hash,
              offerer: order2.offerer,
              chainId: Number(order2.chainId),
            },
          });
          expect(order1InDB.isCancelled).toBe(true);
          expect(order2InDB.isCancelled).toBe(true);
        });

        it('should retry when updateAllCancelledOrder() goes wrong', async () => {
          service.updateAllCancelledOrder = jest
            .fn()
            .mockRejectedValue('Error');

          await service.evmPoll(
            FAKE_CHAIN_ID,
            FAKE_RPC_ENDPOINT,
            FAKE_SEAPORT_ADDRESS,
            FAKE_POLLING_BATCH,
            FAKE_RETRY_LIMIT,
            FAKE_RETRY_CNT,
          );

          expect(service.setRetryTask).toBeCalledTimes(1);
        });
      });
    });
  });
});
