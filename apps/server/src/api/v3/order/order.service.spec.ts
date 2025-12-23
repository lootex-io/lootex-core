import { AssetService } from '@/api/v3/asset/asset.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { LibsService } from '@/common/libs/libs.service';
import { MoralisService } from '@/third-party-api/moralis/moralis.service';
import { GatewayService } from '@/third-party-api/gateway/gateway.service';
import { RpcService } from '@/third-party-api/rpc/rpc.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@/common/cache';
import { CurrencyService } from '@/third-party-api/currency/currency.service';
import { TraitService } from '@/api/v3/trait/trait.service';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import { CreateOrderDTO } from './order.dto';
import { ConfigurationModule } from '@/configuration';
import { BlockchainService } from '@/external/blockchain';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import {
  Asset,
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
  entities,
} from '@/model/entities';
import { providers } from '@/model/providers';
import { JwtService } from '@nestjs/jwt';
import { seeder } from '@/../test/utils/seeder';
import { Category } from './order.interface';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';

const BLOCKCHAIN_ETH = {
  name: 'Ethereum',
  chainId: 1,
  shortName: 'eth',
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
  traits: [
    { value: 'Blazer Blue', traitType: 'Clothing', displayType: '' },
    { value: 'Man', traitType: 'Head', displayType: '' },
    { value: 'Stubble', traitType: 'Mouth', displayType: '' },
    { value: 'Policeman', traitType: 'Hair', displayType: '' },
    { value: 'Street', traitType: 'BG', displayType: '' },
    { value: 'Signature Eyes', traitType: 'Eyes', displayType: '' },
    { value: 'No', traitType: 'Props', displayType: '' },
    { value: 'No', traitType: 'Effect', displayType: '' },
  ],
};
const ASSET_MOAR999 = {
  tokenId: '999',
  name: 'MOAR #999',
  contractId: '',
  chainId: 1,
  traits: [
    {
      value: 'Low Cut Vest Yellow',
      traitType: 'Clothing',
      displayType: 'none',
    },
    { value: 'Woman', traitType: 'Head', displayType: 'none' },
    { value: 'Normal Woman', traitType: 'Mouth', displayType: 'none' },
    { value: 'Balloon', traitType: 'BG', displayType: 'none' },
    { value: 'No', traitType: 'Effect', displayType: 'none' },
    { value: 'Flip Phone', traitType: 'Props', displayType: 'none' },
    { value: 'Beach Lady', traitType: 'Hair', displayType: 'none' },
    { value: 'Closed Eyes', traitType: 'Eyes', displayType: 'none' },
  ],
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
const ASSET = {
  id: 'f876d69b-be17-4891-9b5e-6e597ec9e3cd',
  tokenId: '3298',
  name: 'BEAST #3298',
  description:
    'Connect your wallet to studio.akidcalledbeast.com, to view your complete BEAST and access all files. a KID called BEAST is a Web3 brand and culture that starts with our digital collectibles — 10,000 unique, truly 3D, and AR-Ready. Each BEAST belongs to 1 of 20 beasthoods. The owner is given access to a sub-community of 500 like-minded individuals.',
  imageUrl: 'ipfs://QmZQYqevZBueG7eEeHMv8KwiPiuxWJe4kKSDmZ7Wcj4KaF/3298.png',
  imagePreviewUrl: '',
  externalUrl: '',
  animationUrl:
    'ipfs://QmcCbd4FENiVvH1Pc7LUkhHN6qPPhGWZXKUniPNJ4TaPdB/3298.glb',
  animationType: 'model/gltf-binary',
  googleImageUrl: '',
  backgroundColor: 'F0F5F8',
  traits: [
    {
      value: 'Pants',
      trait_type: 'Bottom',
    },
    {
      value: 'Beige',
      trait_type: 'Pants',
    },
    {
      value: 'Human Pupils',
      trait_type: 'Eyes',
    },
    {
      value: 'Human',
      trait_type: 'DNA',
    },
    {
      value: 'Light',
      trait_type: 'Human',
    },
    {
      value: 'Skull',
      trait_type: 'Balaclava',
    },
    {
      value: 'Black',
      trait_type: 'Balaclava Style',
    },
    {
      value: 'High-Top Sneakers',
      trait_type: 'Footwear',
    },
    {
      value: 'Black & Gray',
      trait_type: 'High-Top Sneakers',
    },
    {
      value: 'Loose Singlet',
      trait_type: 'Top',
    },
    {
      value: 'White',
      trait_type: 'Loose Singlet',
    },
    {
      value: 'Silver Chain',
      trait_type: 'Accessory',
    },
    {
      value: 'Fort Flex',
      trait_type: 'Beasthood',
    },
  ],
  Xtraits: [],
  contractId: '31954d87-2469-4d3d-b83d-e5420742c318',
  tokenUri:
    'https://ipfs.moralis.io:2053/ipfs/QmboCxEoxbJDwkq5RgFJsAHXFHYQUjUsSLxSaKtdsqgRbb/3298',
  createdAt: '2023-02-06T02:59:07.591Z',
  updatedAt: '2023-02-06T02:59:07.592Z',
  lastUpdatedAt: null,
  deletedAt: null,
  chainId: 1,
  Contract: {
    address: '0x77372a4cc66063575b05b44481f059be356964a4',
    id: '31954d87-2469-4d3d-b83d-e5420742c318',
    name: 'a KID called BEAST',
    description: null,
    imageUrl: null,
    iconUrl: null,
    slug: '0x77372a4cc66063575b05b44481f059be356964a4',
    externalUrl: null,
    schemaName: 'ERC721',
    symbol: 'AKCB',
    blockchainId: '194b12c0-4b5e-11eb-8d0b-42010a4d0009',
    createdAt: '2023-02-06T02:59:07.469Z',
    updatedAt: '2023-02-06T02:59:07.469Z',
    deletedAt: null,
    chainId: 1,
  },
  AssetAsEthAccount: [
    {
      id: '18b2f16f-70d3-43d7-967d-9455f4a0adcd',
      assetId: 'f876d69b-be17-4891-9b5e-6e597ec9e3cd',
      quantity: '1',
      ownerAddress: '0xb14c95d1844d5d8b00166e46338f5fc9546df9d5',
      createdAt: '2023-02-06T02:59:07.648Z',
      updatedAt: '2023-02-06T02:59:07.648Z',
      deletedAt: null,
      Wallet: {
        id: '68720754-5e7c-11ed-8283-0242ac130004',
        accountId: '41b69152-5e7c-11ed-b056-0242ac130004',
        transport: 'Injected',
        provider: 'METAMASK_INJECTED',
        chainFamily: 'ETH',
        isMainWallet: true,
        address: '0xb14c95d1844d5d8b00166e46338f5fc9546df9d5',
        status: 'ACTIVE',
        rawData: null,
        createdAt: '2022-11-07T09:13:13.957Z',
        updatedAt: '2022-11-07T09:13:13.957Z',
        deletedAt: null,
        Account: {
          id: '41b69152-5e7c-11ed-b056-0242ac130004',
          email: 'jerry@lootex.io',
          username: 'Jerry',
          fullname: 'Jerry',
          avatarUrl:
            'https://i.seadn.io/gae/BPlLoRLxYzYvlV9YxNZW4yrxX9Oa4DnvaSURo1o7jH530bdr-U7gb__VnMpCblRTX796rxCN7FA_GJbYwnz8Pyu1Af4pb-fJ_dQUjA?auto=format&w=100',
          introduction: null,
          status: 'ACTIVE',
          externalLinks: null,
          createdAt: '2022-11-07T09:12:08.954Z',
          updatedAt: '2022-11-07T09:12:08.954Z',
          deletedAt: null,
          roles: null,
        },
      },
    },
  ],
};

describe('OrderService', () => {
  let service: OrderService;
  let currencyService: CurrencyService;
  let assetService: AssetService;
  let assetExtraService: AssetExtraService;

  async function cleanup() {
    await Wallet.destroy({ truncate: true, cascade: true, force: true });
    await AssetAsEthAccount.destroy({ truncate: true, cascade: true });
    await Asset.destroy({ truncate: true, cascade: true });
    await EthAccount.destroy({ truncate: true, cascade: true });
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
        ...providers,
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    currencyService = module.get<CurrencyService>(CurrencyService);
    assetService = module.get<AssetService>(AssetService);
    assetExtraService = module.get<AssetExtraService>(AssetExtraService);

    await cleanup();

    await seeder.down({ to: 0 as const });
    await seeder.up();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create order', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );

      await service.createOrder(order1);
      const dbOrder1 = await SeaportOrder.findOne({
        where: { hash: order1.hash },
      });

      // test order
      const realDbOrder1 = {
        offerer: dbOrder1.offerer,
        signature: dbOrder1.signature,
        hash: dbOrder1.hash,
        category: dbOrder1.category,
        orderType: dbOrder1.orderType,
        startTime: dbOrder1.startTime,
        endTime: dbOrder1.endTime,
        totalOriginalConsiderationItems:
          dbOrder1.totalOriginalConsiderationItems,
        zone: dbOrder1.zone,
        zoneHash: dbOrder1.zoneHash,
        counter: dbOrder1.counter,
        conduitKey: dbOrder1.conduitKey,
        salt: dbOrder1.salt,
        exchangeAddress: dbOrder1.exchangeAddress,
        chainId: dbOrder1.chainId,
        price: dbOrder1.price,
      };

      const expectOrder1 = {
        offerer: ORDER1_OFFERER,
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
        chainId: 1,
        price: ORDER1_PRICE,
      };
      expect(realDbOrder1).toMatchObject(expectOrder1);

      // test order asset
      const dbOrder1Offer = await SeaportOrderAsset.findOne({
        where: { seaportOrderId: dbOrder1.id, side: 0 },
      });
      const realDbOrder1Offer = {
        side: dbOrder1Offer.side,
        token: dbOrder1Offer.token,
        identifierOrCriteria: dbOrder1Offer.identifierOrCriteria,
        startAmount: dbOrder1Offer.startAmount,
        endAmount: dbOrder1Offer.endAmount,
        recipient: null,
      };
      const expectOrder1Offer = {
        side: 0,
        token: ORDER1_OFFER[0].token,
        identifierOrCriteria: ORDER1_OFFER[0].identifierOrCriteria,
        startAmount: ORDER1_OFFER[0].startAmount,
        endAmount: ORDER1_OFFER[0].endAmount,
        recipient: null,
      };

      expect(realDbOrder1Offer).toMatchObject(expectOrder1Offer);
      const dbOrder1Consideration = await SeaportOrderAsset.findAll({
        where: { seaportOrderId: dbOrder1.id, side: 1 },
      });
      expect(dbOrder1Consideration).toHaveLength(3);
    });

    it('should reject by different offerer and signer', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      const diffOfferer = '0x1234567890123456789012345678901234567890';
      const order1: CreateOrderDTO = {
        offerer: diffOfferer,
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
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );

      await expect(service.createOrder(order1)).rejects.toThrow(
        'Invalid signature',
      );
    });

    it('should reject by different hash', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
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
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );

      jest
        .spyOn(service, 'getOrderHash')
        .mockReturnValue(
          '0x1234567896d234e4303a7828d8c1975498e2f7a8d7ff8f650e5e625188ddf801',
        );
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(ORDER1_OFFERER);

      await expect(service.createOrder(order1)).rejects.toThrow(
        'Invalid order hash',
      );
    });

    it('should reject by offer not support asset', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      // const asset = await Asset.create(ASSET_MOAR4131);

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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );

      await expect(service.createOrder(order1)).rejects.toThrow(
        'offer or consideration Asset not found',
      );
    });
  });
  // describe('getOrderSigner', () => {
  //   it('should return right signer', async () => {
  //     const order1: CreateOrderDTO = {
  //       offerer: ORDER1_OFFERER,
  //       offer: ORDER1_OFFER,
  //       consideration: ORDER1_CONSIDERATION,
  //       signature: ORDER1_SIGNATURE,
  //       hash: ORDER1_HASH,
  //       category: ORDER1_CATEGORY,
  //       orderType: ORDER1_TYPE,
  //       startTime: ORDER1_STARTTIME,
  //       endTime: ORDER1_ENDTIME,
  //       totalOriginalConsiderationItems: ORDER1_TOTALCONSIDERATION,
  //       zone: ORDER1_ZONE,
  //       zoneHash: ORDER1_ZONEHASH,
  //       counter: ORDER1_COUNTER,
  //       conduitKey: ORDER1_CONDUIT_KEY,
  //       salt: ORDER1_SALT,
  //       exchangeAddress: ORDER1_EXCHANGE_ADDRESS,
  //       chainId: ORDER1_CHAINID,
  //     };
  //     currencyService.getSymbolPrice = jest
  //       .fn()
  //       .mockResolvedValue(
  //         Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
  //       );

  //     expect(service.getOrderSigner(order1).toLowerCase()).toBe(ORDER1_OFFERER);
  //   });
  // });
  describe('getOrder', () => {
    it('should return order', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );

      await service.createOrder(order1);

      const getOrder1 = await service.getOrder({
        offerer: ORDER1_OFFERER,
        limit: 10,
        page: 1,
      });

      expect(getOrder1.orders[0].offerer).toBe(ORDER1_OFFERER);
      expect(getOrder1.count).toBe(1);
    });

    it('should filter by offerer', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      await service.createOrder(order1);
      const ORDER2_HASH = '0x2';
      const ORDER2_OFFERER = '0x2';
      const ORDER2_CONSIDERATION = [
        {
          itemType: 0,
          token: '0x0000000000000000000000000000000000000000',
          identifierOrCriteria: '0',
          startAmount: '2000000000000000000',
          endAmount: '2000000000000000000',
          recipient: '0xb14c95D1844D5d8B00166e46338F5Fc9546DF9D5',
        },
      ];

      const order2: CreateOrderDTO = {
        offerer: ORDER2_OFFERER,
        offer: ORDER1_OFFER,
        consideration: ORDER2_CONSIDERATION,
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order2.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order2.offerer);
      await service.createOrder(order2);

      const getOrder2 = await service.getOrder({
        offerer: ORDER2_OFFERER,
        limit: 10,
        page: 1,
      });
      expect(getOrder2.orders[0].offerer).toBe(ORDER2_OFFERER);
      expect(getOrder2.count).toBe(1);

      const getOrder1 = await service.getOrder({
        priceLte: '1',
        limit: 10,
        page: 1,
      });
      expect(getOrder1.orders[0].offerer).toBe(ORDER1_OFFERER);
      expect(getOrder1.count).toBe(1);

      const getOrder1And2 = await service.getOrder({
        priceBetween: '0.5,10',
        limit: 10,
        page: 1,
      });
      console.log(getOrder1And2);
      expect(getOrder1And2.count).toBe(2);
    });

    it('should filter by price', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      await service.createOrder(order1);
      const ORDER2_HASH = '0x2';
      const ORDER2_OFFERER = '0x2';
      const ORDER2_CONSIDERATION = [
        {
          itemType: 0,
          token: '0x0000000000000000000000000000000000000000',
          identifierOrCriteria: '0',
          startAmount: '2000000000000000000',
          endAmount: '2000000000000000000',
          recipient: '0xb14c95D1844D5d8B00166e46338F5Fc9546DF9D5',
        },
      ];

      const order2: CreateOrderDTO = {
        offerer: ORDER2_OFFERER,
        offer: ORDER1_OFFER,
        consideration: ORDER2_CONSIDERATION,
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order2.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order2.offerer);
      await service.createOrder(order2);

      const getOrder2 = await service.getOrder({
        priceGt: '1',
        limit: 10,
        page: 1,
      });
      expect(getOrder2.orders[0].offerer).toBe(ORDER2_OFFERER);
      expect(getOrder2.count).toBe(1);

      const getOrder1 = await service.getOrder({
        priceLte: '1',
        limit: 10,
        page: 1,
      });
      expect(getOrder1.orders[0].offerer).toBe(ORDER1_OFFERER);
      expect(getOrder1.count).toBe(1);

      const getOrder1And2 = await service.getOrder({
        priceBetween: '0.5,10',
        limit: 10,
        page: 1,
      });
      console.log(getOrder1And2);
      expect(getOrder1And2.count).toBe(2);
    });

    it('should filter by category', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      await service.createOrder(order1);

      const ORDER2_CATEGORY = Category.OFFER;
      const ORDER2_HASH = '0x2';
      const order2: CreateOrderDTO = {
        offerer: ORDER1_OFFERER,
        offer: ORDER1_OFFER,
        consideration: ORDER1_CONSIDERATION,
        signature: ORDER1_SIGNATURE,
        hash: ORDER2_HASH,
        category: ORDER2_CATEGORY,
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order2.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order2.offerer);
      await service.createOrder(order2);

      const getOrder2 = await service.getOrder({
        category: ORDER2_CATEGORY,
        limit: 10,
        page: 1,
      });

      expect(getOrder2.orders[0].hash).toBe(ORDER2_HASH);
    });

    it('should filter by contract & tokenId', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      await service.createOrder(order1);

      const ORDER2_HASH = '0x2';
      const ORDER2_OFFER = [
        {
          itemType: 2,
          token: '0x0000000000111111111122222222223333333333',
          identifierOrCriteria: '1234',
          startAmount: '1',
          endAmount: '1',
        },
      ];

      const CONTRACT_TEST = {
        address: '0x0000000000111111111122222222223333333333'.toLowerCase(),
        name: 'Test contract',
        blockchainId: '',
        chainId: 1,
      };
      const ASSET_TEST1234 = {
        tokenId: '1234',
        name: 'TEST #4131',
        contractId: '',
        chainId: 1,
      };
      CONTRACT_TEST.blockchainId = blockchain.id;
      const contract2 = await Contract.create(CONTRACT_TEST);
      ASSET_TEST1234.contractId = contract2.id;
      const asset2 = await Asset.create(ASSET_TEST1234);

      const order2: CreateOrderDTO = {
        offerer: ORDER1_OFFERER,
        offer: ORDER2_OFFER,
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order2.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order2.offerer);
      await service.createOrder(order2);

      const getOrder1 = await service.getOrder({
        contractAddress: CONTRACT_MOAR.address,
        tokenId: ASSET_MOAR4131.tokenId,
        limit: 10,
        page: 1,
      });

      const getOrder2 = await service.getOrder({
        contractAddress: CONTRACT_TEST.address,
        limit: 10,
        page: 1,
      });

      expect(getOrder1.orders[0].hash).toBe(ORDER1_HASH);
      expect(getOrder2.orders[0].hash).toBe(ORDER2_HASH);
    });

    it('should filter by exchangeAddress', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      await service.createOrder(order1);

      const ORDER2_EXCHANGE_ADDRESS =
        '0x0000000000111111111122222222223333333333';
      const ORDER2_HASH = '0x2';
      const order2: CreateOrderDTO = {
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
        exchangeAddress: ORDER2_EXCHANGE_ADDRESS,
        chainId: ORDER1_CHAINID,
      };
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order2.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order2.offerer);
      await service.createOrder(order2);

      const getOrder2 = await service.getOrder({
        exchangeAddress: ORDER2_EXCHANGE_ADDRESS,
        limit: 10,
        page: 1,
      });

      expect(getOrder2.orders[0].hash).toBe(ORDER2_HASH);
    });

    it('should filter by startTime & endTime', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      await service.createOrder(order1);
      const ORDER2_STARTTIME = ORDER1_STARTTIME + 5000;
      const ORDER2_ENDTIME = ORDER1_ENDTIME + 5000;
      const ORDER2_HASH = '0x2';
      const order2: CreateOrderDTO = {
        offerer: ORDER1_OFFERER,
        offer: ORDER1_OFFER,
        consideration: ORDER1_CONSIDERATION,
        signature: ORDER1_SIGNATURE,
        hash: ORDER2_HASH,
        category: ORDER1_CATEGORY,
        orderType: ORDER1_TYPE,
        startTime: ORDER2_STARTTIME,
        endTime: ORDER2_ENDTIME,
        totalOriginalConsiderationItems: ORDER1_TOTALCONSIDERATION,
        zone: ORDER1_ZONE,
        zoneHash: ORDER1_ZONEHASH,
        counter: ORDER1_COUNTER,
        conduitKey: ORDER1_CONDUIT_KEY,
        salt: ORDER1_SALT,
        exchangeAddress: ORDER1_EXCHANGE_ADDRESS,
        chainId: ORDER1_CHAINID,
      };
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order2.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order2.offerer);
      await service.createOrder(order2);

      const getOrder1 = await service.getOrder({
        startTimeLt: ORDER1_STARTTIME + 1,
        limit: 10,
        page: 1,
      });
      const getOrder2 = await service.getOrder({
        endTimeGt: ORDER1_ENDTIME + 1,
        limit: 10,
        page: 1,
      });

      expect(getOrder1.orders[0].hash).toBe(ORDER1_HASH);
      expect(getOrder2.orders[0].hash).toBe(ORDER2_HASH);
    });

    it('should filter by currency symbol', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      await service.createOrder(order1);

      const CURRENCY_TEST_WRAP = {
        name: 'TEST',
        symbol: 'TEST',
        address: '0x1111111111111111111111111111111111111111',
        decimals: 18,
        blockchainId: '',
        isNative: false,
        isWrapped: true,
      };
      CURRENCY_TEST_WRAP.blockchainId = blockchain.id;
      await Currency.create(CURRENCY_TEST_WRAP);
      const ORDER2_CONSIDERATION = [
        {
          itemType: 0,
          token: '0x1111111111111111111111111111111111111111',
          identifierOrCriteria: '0',
          startAmount: '887550000000000000',
          endAmount: '887550000000000000',
          recipient: '0xb14c95D1844D5d8B00166e46338F5Fc9546DF9D5',
        },
        {
          itemType: 0,
          token: '0x1111111111111111111111111111111111111111',
          identifierOrCriteria: '0',
          startAmount: '24250000000000000',
          endAmount: '24250000000000000',
          recipient: '0x0000a26b00c1F0DF003000390027140000fAa719',
        },
        {
          itemType: 0,
          token: '0x1111111111111111111111111111111111111111',
          identifierOrCriteria: '0',
          startAmount: '58200000000000000',
          endAmount: '58200000000000000',
          recipient: '0xB75afBa91d6BEfc8B2ee739270827Fd9C5714CfB',
        },
      ];
      const ORDER2_HASH = '0x2';
      const order2: CreateOrderDTO = {
        offerer: ORDER1_OFFERER,
        offer: ORDER1_OFFER,
        consideration: ORDER2_CONSIDERATION,
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order2.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order2.offerer);
      await service.createOrder(order2);

      const getOrder1 = await service.getOrder({
        currencySymbol: 'ETH',
        limit: 10,
        page: 1,
      });
      const getOrder2 = await service.getOrder({
        currencySymbol: 'TEST',
        limit: 10,
        page: 1,
      });

      expect(getOrder1.orders[0].hash).toBe(ORDER1_HASH);
      expect(getOrder2.orders[0].hash).toBe(ORDER2_HASH);
    });

    it('should filter by chainId', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      await service.createOrder(order1);

      const ORDER2_CHAINID = '56';
      const BLOCKCHAIN_BNB = {
        name: 'Binance Smart Chain',
        chainId: ORDER2_CHAINID,
        shortName: 'bnb',
      };
      const CONTRACT_MOAR_BNB = {
        address: '0xeB3a9A839dFeEaf71db1B4eD6a8ae0cCB171b227'.toLowerCase(),
        name: 'MOAR by Joan Cornella',
        blockchainId: '',
        chainId: 56,
      };
      const ASSET_MOAR4131_BNB = {
        tokenId: '4131',
        name: 'MOAR #4131',
        contractId: '',
        chainId: 56,
      };
      const CURRENCY_BNB_NATIVE = {
        name: 'BNB',
        symbol: 'BNB',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        blockchainId: '',
        isNative: true,
        isWrapped: false,
      };
      const blockchainBnb = await Blockchain.create(BLOCKCHAIN_BNB);
      CURRENCY_BNB_NATIVE.blockchainId = blockchainBnb.id;
      await Currency.create(CURRENCY_BNB_NATIVE);
      CONTRACT_MOAR_BNB.blockchainId = blockchainBnb.id;
      const contractBnb = await Contract.create(CONTRACT_MOAR_BNB);
      ASSET_MOAR4131_BNB.contractId = contractBnb.id;
      await Asset.create(ASSET_MOAR4131_BNB);

      const ORDER2_HASH = '0x2';
      const order2: CreateOrderDTO = {
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
        chainId: ORDER2_CHAINID,
      };
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order2.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order2.offerer);
      await service.createOrder(order2);

      const getOrder1 = await service.getOrder({
        chainId: '1',
        limit: 10,
        page: 1,
      });
      const getOrder2 = await service.getOrder({
        chainId: '56',
        limit: 10,
        page: 1,
      });

      expect(getOrder1.orders[0].hash).toBe(ORDER1_HASH);
      expect(getOrder2.orders[0].hash).toBe(ORDER2_HASH);
    });

    it('should filter by traits', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset1 = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      await service.createOrder(order1);

      const ORDER3_OFFER = [
        {
          itemType: 2,
          token: '0xeB3a9A839dFeEaf71db1B4eD6a8ae0cCB171b227',
          identifierOrCriteria: '999',
          startAmount: '1',
          endAmount: '1',
        },
      ];
      ASSET_MOAR999.contractId = contract.id;
      const asset3 = await Asset.create(ASSET_MOAR999);
      const ORDER3_HASH = '0x3';
      const order3: CreateOrderDTO = {
        offerer: ORDER1_OFFERER,
        offer: ORDER3_OFFER,
        consideration: ORDER1_CONSIDERATION,
        signature: ORDER1_SIGNATURE,
        hash: ORDER3_HASH,
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order3.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      await service.createOrder(order3);

      const ORDER2_HASH = '0x2';
      const ORDER2_OFFER = [
        {
          itemType: 2,
          token: '0x0000000000111111111122222222223333333333',
          identifierOrCriteria: '1234',
          startAmount: '1',
          endAmount: '1',
        },
      ];

      const CONTRACT_TEST = {
        address: '0x0000000000111111111122222222223333333333'.toLowerCase(),
        name: 'Test contract',
        blockchainId: '',
        chainId: 1,
      };
      const ASSET_TEST1234 = {
        tokenId: '1234',
        name: 'TEST #4131',
        contractId: '',
        chainId: 1,
      };
      CONTRACT_TEST.blockchainId = blockchain.id;
      const contract2 = await Contract.create(CONTRACT_TEST);
      ASSET_TEST1234.contractId = contract2.id;
      const asset2 = await Asset.create(ASSET_TEST1234);

      const order2: CreateOrderDTO = {
        offerer: ORDER1_OFFERER,
        offer: ORDER2_OFFER,
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order2.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order2.offerer);
      await service.createOrder(order2);

      const getOrder1 = await service.getOrder({
        chainId: '1',
        contractAddress: '0xeB3a9A839dFeEaf71db1B4eD6a8ae0cCB171b227',
        traits: {
          stringTraits: {
            Clothing: ['Blazer Blue'],
          },
        },
        limit: 10,
        page: 1,
      });
      const getOrder3 = await service.getOrder({
        chainId: '1',
        contractAddress: '0xeB3a9A839dFeEaf71db1B4eD6a8ae0cCB171b227',
        traits: {
          stringTraits: { Mouth: ['Normal Woman'] },
        },
        limit: 10,
        page: 1,
      });

      expect(getOrder1.orders[0].hash).toBe(ORDER1_HASH);
      expect(getOrder3.orders[0].hash).toBe(ORDER3_HASH);
    });

    it('should sort by price', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      await service.createOrder(order1);
      const ORDER2_HASH = '0x2';
      const ORDER2_OFFERER = '0x2';
      const ORDER2_CONSIDERATION = [
        {
          itemType: 0,
          token: '0x0000000000000000000000000000000000000000',
          identifierOrCriteria: '0',
          startAmount: '2000000000000000000',
          endAmount: '2000000000000000000',
          recipient: '0xb14c95D1844D5d8B00166e46338F5Fc9546DF9D5',
        },
      ];

      const order2: CreateOrderDTO = {
        offerer: ORDER2_OFFERER,
        offer: ORDER1_OFFER,
        consideration: ORDER2_CONSIDERATION,
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order2.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order2.offerer);
      await service.createOrder(order2);

      const getOrderPriceASC = await service.getOrder({
        sortBy: [['price', 'ASC']],
        limit: 10,
        page: 1,
      });
      expect(
        getOrderPriceASC.orders[0].price < getOrderPriceASC.orders[1].price,
      ).toBe(true);

      const getOrderPriceDESC = await service.getOrder({
        sortBy: [['price', 'DESC']],
        limit: 10,
        page: 1,
      });
      expect(
        getOrderPriceDESC.orders[0].price > getOrderPriceDESC.orders[1].price,
      ).toBe(true);
    });

    it('should sort by updatedAt', async () => {
      jest
        .spyOn(assetExtraService, 'updateBestOrder')
        .mockReturnValue(Promise.resolve());
      currencyService.getSymbolPrice = jest
        .fn()
        .mockResolvedValue(
          Promise.resolve({ symbol: 'ETHUSD', price: '1000' }),
        );
      const blockchain = await Blockchain.create(BLOCKCHAIN_ETH);
      CURRENCY_ETH_NATIVE.blockchainId = blockchain.id;
      const currency = await Currency.create(CURRENCY_ETH_NATIVE);
      CONTRACT_MOAR.blockchainId = blockchain.id;
      const contract = await Contract.create(CONTRACT_MOAR);
      ASSET_MOAR4131.contractId = contract.id;
      const asset = await Asset.create(ASSET_MOAR4131);
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order1.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order1.offerer);
      assetService.findById = jest
        .fn()
        .mockResolvedValue(Promise.resolve(ASSET));
      await service.createOrder(order1);
      const ORDER2_HASH = '0x2';
      const ORDER2_OFFERER = '0x2';
      const ORDER2_CONSIDERATION = [
        {
          itemType: 0,
          token: '0x0000000000000000000000000000000000000000',
          identifierOrCriteria: '0',
          startAmount: '2000000000000000000',
          endAmount: '2000000000000000000',
          recipient: '0xb14c95D1844D5d8B00166e46338F5Fc9546DF9D5',
        },
      ];

      const order2: CreateOrderDTO = {
        offerer: ORDER2_OFFERER,
        offer: ORDER1_OFFER,
        consideration: ORDER2_CONSIDERATION,
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
      jest.spyOn(service, 'getOrderHash').mockReturnValue(order2.hash);
      jest.spyOn(service, 'getOrderSigner').mockReturnValue(order2.offerer);
      await service.createOrder(order2);

      const getOrderPriceASC = await service.getOrder({
        sortBy: [['updatedAt', 'ASC']],
        limit: 10,
        page: 1,
      });
      expect(
        getOrderPriceASC.orders[0].updatedAt <
          getOrderPriceASC.orders[1].updatedAt,
      ).toBe(true);

      const getOrderPriceDESC = await service.getOrder({
        sortBy: [['updatedAt', 'DESC']],
        limit: 10,
        page: 1,
      });
      expect(
        getOrderPriceDESC.orders[0].updatedAt >
          getOrderPriceDESC.orders[1].updatedAt,
      ).toBe(true);
    });
  });
});
