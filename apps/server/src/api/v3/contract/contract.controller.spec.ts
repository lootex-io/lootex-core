import { TraitService } from '@/api/v3/trait/trait.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ContractController } from '@/api/v3/contract/contract.controller';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { CacheModule } from '@/common/cache';
import { providers } from '@/model/providers';
import { ThirdPartyApiModule } from '@/third-party-api/thirdPartyApi.module';
import { AssetService } from '@/api/v3/asset/asset.service';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { Contract, Blockchain, entities } from '@/model/entities';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { ChainId } from '@/common/utils/types';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';

const mockBlockChain = {
  name: 'Ethereum Mainnet',
  chain: 'ETH',
  network: 'mainnet',
  short_name: 'eth',
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

describe('ContractController', () => {
  let controller: ContractController;
  let libsService: LibsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetService,
        AssetExtraService,
        ContractService,
        TraitService,
        LibsService,
        CollectionService,
        ...providers,
      ],
      controllers: [ContractController],
      imports: [
        CacheModule.register(),
        ConfigurationModule,
        ThirdPartyApiModule,
        TestSequelizeModule.forRootAsync(entities),
        SequelizeModule.forFeature(entities),
      ],
    })
      .overrideProvider(LibsService)
      .useValue(libsServiceMock)
      .compile();

    controller = module.get<ContractController>(ContractController);
    libsService = module.get<LibsService>(LibsService);

    // add mock contract data
    const [blockChain] = await Blockchain.findOrCreate({
      where: {},
      defaults: mockBlockChain,
    }).catch((err) => {
      console.log(err);
      return [];
    });

    await Contract.create({
      address: mockContract.address,
      name: mockContract.name,
      symbol: mockContract.symbol,
      chainId: mockContract.chainId,
      blockchainId: blockChain.id,
    }).catch((err) => {
      return Promise.resolve();
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

  it('should be defined', async () => {
    expect(controller).toBeDefined();
  });

  describe('GET /contracts/:contractAddress', () => {
    it('should return a contract', async () => {
      const contract = await controller.getContractInfo({
        chainId: mockContract.chainId.toString() as ChainId,
        contractAddress: mockContract.address,
      });
      expect(contract.address).toBe(mockContract.address);
      expect(contract.chainId).toBe(mockContract.chainId);
    });
  });
});
