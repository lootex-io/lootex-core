import { ContractService } from '@/api/v3/contract/contract.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { LibsService } from '@/common/libs/libs.service';
import { MoralisService } from '@/third-party-api/moralis/moralis.service';
import { RpcService } from '@/third-party-api/rpc/rpc.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@/common/cache';
import { CurrencyService } from '@/third-party-api/currency/currency.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { CreateOrderDTO } from './order.dto';
import { ConfigurationModule } from '@/configuration';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { BlockchainService } from '@/external/blockchain';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import {
  Asset,
  Account,
  Wallet,
  AssetAsEthAccount,
  Contract,
  Blockchain,
  SeaportOrder,
  SeaportOrderAsset,
  SeaportOrderHistory,
  Currency,
  entities,
} from '@/model/entities';
import { providers } from '@/model/providers';
import { JwtService } from '@nestjs/jwt';
import { AuthJwtGuard } from '@/api/v3/auth/auth.jwt.guard';
import {
  AuthSupportedWalletTransport,
  AuthSupportedWalletProviderEnum,
  AuthSupportedChainFamily,
} from '@/api/v3/auth/auth.interface';
import { seeder } from '@/../test/utils/seeder';
import { Category } from './order.interface';
import { GatewayService } from '@/third-party-api/gateway/gateway.service';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';

const BLOCKCHAIN_ETH = {
  name: 'Ethereum',
  chainId: 1,
};
const CURRENCY_ETH_NATIVE = {
  name: 'ETH',
  symbol: 'ETH',
  address: '0x0000000000000000000000000000000000000000',
  decimals: 18,
  blockchainId: '',
  isNative: true,
  isWrapped: false,
};
const CONTRACT_MOAR = {
  address: '0xeB3a9A839dFeEaf71db1B4eD6a8ae0cCB171b227'.toLowerCase(),
  name: 'MOAR by Joan Cornella',
  blockchainId: '',
  chainId: 1,
};
const ASSET_MOAR4131 = {
  tokenId: '4131',
  name: 'MOAR #4131',
  contractId: '',
  chainId: 1,
};
const ORDER1_OFFERER = '0xb14c95d1844d5d8b00166e46338f5fc9546df9d5';
const ORDER1_OFFER = [
  {
    itemType: 2,
    token: '0xeB3a9A839dFeEaf71db1B4eD6a8ae0cCB171b227',
    identifierOrCriteria: '4131',
    startAmount: '1',
    endAmount: '1',
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

describe('OrderController', () => {
  let controller: OrderController;
  let service: OrderService;
  let assetExtraService: AssetExtraService;

  async function cleanup() {
    await Wallet.destroy({ truncate: true, cascade: true, force: true });
    await AssetAsEthAccount.destroy({ truncate: true, cascade: true });
    await Asset.destroy({ truncate: true, cascade: true });
    await Contract.destroy({ truncate: true, cascade: true });
    await Blockchain.destroy({ truncate: true, cascade: true });
    await SeaportOrder.destroy({ truncate: true, cascade: true });
    await SeaportOrderAsset.destroy({ truncate: true, cascade: true });
    await SeaportOrderHistory.destroy({ truncate: true, cascade: true });
    await Currency.destroy({ truncate: true, cascade: true });
    await Account.destroy({ truncate: true, cascade: true, force: true });
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register(),
        ConfigurationModule,
        TestSequelizeModule.forRootAsync(entities),
        HttpModule,
        SequelizeModule.forFeature(entities),
      ],
      providers: [
        OrderService,
        JwtService,
        BlockchainService,
        TraitService,
        CurrencyService,
        AssetService,
        AssetExtraService,
        ContractService,
        GatewayService,
        LibsService,
        CollectionService,
        MoralisService,
        RpcService,
        CollectionService,
        ...providers,
      ],
      controllers: [OrderController],
    })
      .overrideGuard(AuthJwtGuard)
      .useValue({
        canActivate: () => {
          return true;
        },
      }) // TODO: change to: import { mockPassGuard } from '@/../test/utils/auth.guard.mock';
      .compile();

    controller = module.get<OrderController>(OrderController);
    service = module.get<OrderService>(OrderService);
    assetExtraService = module.get<AssetExtraService>(AssetExtraService);

    await cleanup();

    await seeder.down({ to: 0 as const });
    await seeder.up();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  describe('POST /create Order', () => {
    it('should be called service.createOrder', async () => {
      const account = await Account.create({
        email: 'lootex@lootex.io',
        username: 'Lootex',
      });
      const wallet = await Wallet.create({
        accountId: account.id,
        transport: AuthSupportedWalletTransport.INJECTED,
        provider: AuthSupportedWalletProviderEnum.METAMASK_INJECTED,
        chainFamily: AuthSupportedChainFamily.ETH,
        address: '0xb14c95d1844d5d8b00166e46338f5fc9546df9d5',
        isMainWallet: true,
      });
      const order1: CreateOrderDTO = {
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
      };

      jest.spyOn(service, 'createOrder').mockReturnValue(Promise.resolve(true));
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());

      expect(await controller.createSeaportOrder(order1, wallet)).toBe(true);
    });
    it('should be reject for different offerer and user', async () => {
      const diffUserAddress = '0x12345678944d5d8b00166e46338f5fc9546df9d5';
      const account = await Account.create({
        email: 'lootex@lootex.io',
        username: 'Lootex',
      });
      const wallet = await Wallet.create({
        accountId: account.id,
        transport: AuthSupportedWalletTransport.INJECTED,
        provider: AuthSupportedWalletProviderEnum.METAMASK_INJECTED,
        chainFamily: AuthSupportedChainFamily.ETH,
        address: diffUserAddress,
        isMainWallet: true,
      });

      const order1: CreateOrderDTO = {
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
      };

      jest.spyOn(service, 'createOrder').mockReturnValue(Promise.resolve(true));
      await expect(
        controller.createSeaportOrder(order1, wallet),
      ).rejects.toThrowError('wallet address not match offerer');
    });
  });
});
