import { TraitService } from '@/api/v3/trait/trait.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ContractService } from '@/api/v3/contract/contract.service';
import { ConfigurationModule } from '@/configuration';
import { ConfigService } from '@nestjs/config';
import { ConfigurationService } from '@/configuration/configuration.service';
import { HttpModule } from '@nestjs/axios';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { CacheModule } from '@/common/cache';
import { providers } from '@/model/providers';
import { entities, Contract, Blockchain } from '@/model/entities';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { ThirdPartyApiModule } from '@/third-party-api/thirdPartyApi.module';
import { GatewayService } from '@/third-party-api/gateway/gateway.service';
import { ChainId } from '@/common/utils/types';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';

const mockBlockChain = {
  name: 'Ethereum Mainnet',
  chain: 'ETH',
  network: 'mainnet',
  chain_id: 1,
  network_id: 1,
};

const mockContract = {
  address: '0x1111222222000000000000000000001111111111',
  name: 'mock test',
  symbol: 'MT',
  chainId: 1,
};

const libsServiceMock = jest.mock('@/common/libs/libs.service');

describe('ContractService', () => {
  let service: ContractService;
  let gatewayService: GatewayService;
  let libsService: LibsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        HttpModule,
        CacheModule.register(),
        ThirdPartyApiModule,
        ConfigurationModule,
        CacheModule.register(),
        TestSequelizeModule.forRootAsync(entities),
        SequelizeModule.forFeature(entities),
      ],
      providers: [
        ContractService,
        ConfigurationService,
        ConfigService,
        LibsService,
        CollectionService,
        AssetService,
        AssetExtraService,
        TraitService,
        ...providers,
      ],
    })
      .overrideProvider(LibsService)
      .useValue(libsServiceMock)
      .compile();

    service = module.get<ContractService>(ContractService);
    gatewayService = module.get<GatewayService>(GatewayService);
    libsService = module.get<LibsService>(LibsService);

    const [blockChain] = await Blockchain.findOrCreate({
      where: {},
      defaults: mockBlockChain,
    }).catch((err) => {
      console.log(err);
      return [];
    });

    // add mock contract data
    await Contract.create({
      address: mockContract.address,
      name: mockContract.name,
      symbol: mockContract.symbol,
      chainId: mockContract.chainId,
      blockchainId: blockChain.id,
    }).catch((err) => {
      console.log(err);
    });
  });

  afterEach(async () => {
    // delete mock contract data
    await Contract.destroy({
      where: {
        address: mockContract.address,
        name: mockContract.name,
        symbol: mockContract.symbol,
        chainId: mockContract.chainId,
      },
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ContractService.findOne()', () => {
    it('should return a contract', async () => {
      const contract = await service.findOne(
        mockContract.chainId.toString() as ChainId,
        mockContract.address,
      );
      expect(contract.address).toBe(mockContract.address);
      expect(contract.chainId).toBe(mockContract.chainId);
    });
  });

  describe('Create a Contract', () => {
    it('should return a contract', async () => {
      // const ca = '0x15C710575e3725d19C45794783Efde2372949a5a';
      // const chainId = '1';
      // const ret = await service.create(chainId, ca);
      // expect(ret.address).toBe(ca);
      // expect(ret.chainId).toBe(+chainId);
      // await Contract.destroy({
      //   where: {
      //     address: ca,
      //     chainId: chainId,
      //   },
      // });
    });

    it('Migrate Contract table data to Collection table', async () => {
      //   let c;
      //   const _limit = 2;
      //   let _offset = 0;
      //   // skip, if collection is already built up
      //   const cnt = await Collection.count();
      //   while (!cnt) {
      //     c = await Contract.findAll({
      //       limit: _limit,
      //       offset: _offset,
      //       order: [['id', 'asc']],
      //       include: [
      //         {
      //           model: Blockchain,
      //           as: 'Blockchain',
      //         },
      //       ],
      //     });
      //     const ccMap = new Map();
      //     c.forEach((con) => {
      //       ccMap.set(`${con.address}_${con.chainId}`, con);
      //     });
      //     const cMap = new Map();
      //     c.forEach((con) => {
      //       let a = cMap.get(`${con.chainId}`);
      //       if (!a) {
      //         cMap.set(`${con.chainId}`, []);
      //         a = cMap.get(`${con.chainId}`);
      //       }
      //       cMap.set(`${con.chainId}`, [...a, con.address.toString('hex')]);
      //     });
      //     const res = [];
      //     for (const [chain, addrs] of cMap.entries()) {
      //       const contractOwners = await gatewayService.getContractOwnerOnChain(
      //         chain,
      //         addrs,
      //       );
      //       for (const co of contractOwners) {
      //         const w = await Wallet.findOne({
      //           where: {
      //             address: co.ownerAddress,
      //           },
      //         });
      //         if (!w) continue;
      //         const b = await Blockchain.findOne({
      //           where: {
      //             chainId: chain,
      //           },
      //         });
      //         const chainShortName = {
      //           '1': 'ETH',
      //           '5': 'ETH_TESTNET',
      //           '56': 'BSC',
      //           '97': 'BSC_TESTNET',
      //           '137': 'POLYGON',
      //           '80001': 'POLYGON_TESTNET',
      //           '43114': 'AVAX',
      //           '43113': 'AVAX_TESTNET',
      //           '42161': 'ARBITRUM',
      //           '421613': 'ARBITRUM_TESTNET',
      //         };
      //         const tmp = await Collection.findOne({
      //           where: {
      //             slug: `${co.contractAddress}`,
      //           },
      //         });
      //         const tmp1 = await Collection.findOne({
      //           where: {
      //             slug: `${co.contractAddress}`,
      //             chainShortName: chainShortName[chain],
      //           },
      //         });
      //         if (tmp1?.slug) {
      //           console.log(`duplicated address: ${tmp1.slug}`);
      //           continue;
      //         }
      //         let computedSlug;
      //         if (tmp) {
      //           computedSlug = `${
      //             ccMap.get(`${co.contractAddress}_${chain}`).slug
      //           }.${chain}`;
      //         } else {
      //           computedSlug = `${co.contractAddress}`;
      //         }
      //         const asset = {
      //           ownerAccountId: w.accountId,
      //           contractAddress: co.contractAddress,
      //           chainShortName: chainShortName[chain],
      //           name: ccMap.get(`${co.contractAddress}_${chain}`).name,
      //           description: ccMap.get(`${co.contractAddress}_${chain}`)
      //             .description,
      //           bannerImageUrl: ccMap.get(`${co.contractAddress}_${chain}`)
      //             .imageUrl,
      //           logoImageUrl: ccMap.get(`${co.contractAddress}_${chain}`).iconUrl,
      //           blockchainId: b.id,
      //           slug: computedSlug,
      //         };
      //         const s = await Collection.create(asset);
      //       }
      //     }
      //     if (c.length == _limit) {
      //       _offset += _limit;
      //     } else {
      //       break;
      //     }
      //   }
    });
  });
});
