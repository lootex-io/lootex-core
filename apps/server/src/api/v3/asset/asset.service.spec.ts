import { TraitService } from '@/api/v3/trait/trait.service';
import { ThirdPartyApiModule } from '@/third-party-api/thirdPartyApi.module';
import { GatewayService } from '@/third-party-api/gateway/gateway.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '@/common/cache';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import {
  Asset,
  AssetAsEthAccount,
  Account,
  EthAccount,
  Contract,
  Blockchain,
  entities,
} from '@/model/entities';
import { providers } from '@/model/providers';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { seeder } from '@/../test/utils/seeder';
import * as mimeTypes from 'mime-types';
import { TraitModule } from '@/api/v3/trait/trait.module';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';

// -----------------Test data-----------------
const chainId1 = '1';

const ownerAddress1 = '0xc87632268e149ae86f064d16596a0af09f5c8763';
const ownerAddress2 = '0x528932268e149ae86f064d16596a0af09f5b5278';

const contract1 = {
  contractAddress: '0x11552892ed14bd178f0928abce94c1373b821155',
  name: 'BruceTheGoose1155',
  symbol: 'BTGE1155',
  contractType: 'ERC1155',
};
const contract2 = {
  contractAddress: '0x72102892ed14bd178f0928abce94c1373b821721',
  name: 'BruceTheGoose721',
  symbol: 'BTGE721',
  contractType: 'ERC721',
};

const metadata1 = {
  description: 'test',
  imageUrl: 'http://localhost:8080/images/imageUrl.png',
  externalUrl: 'http://localhost:8080/images/externalUrl.png',
  background_color: '000000',
  attributes: [
    { value: '16185', traitType: 'id', displayType: '' },
    { value: 'Water', traitType: 'element', displayType: '' },
    { value: 1, traitType: 'stars', displayType: '' },
    { value: '', traitType: 'burntStars', displayType: '' },
  ],
  animation_url: 'http://localhost:8080/images/animationUrl.png',
};
const tokenId1 = '1';
const tokenId2 = '2';
const tokenUri1 =
  'https://storage.qubic.market/1/0x5c6e2892ed14bd178f0928abce94c1373b8265eb/1';
const tokenUri2 =
  'https://storage.qubic.market/2/0x5c6e2892ed14bd178f0928abce94c1373b8265eb/2';
const token1Amount = '1';
const token2Amount = '56';

const gatewayMock = jest.mock('@/third-party-api/gateway/gateway.service');
const libsServiceMock = jest.mock('@/common/libs/libs.service');
const contractServiceMock = jest.mock('@/api/v3/contract/contract.service');

describe('AssetService', () => {
  let service: AssetService;
  let gatewayService: GatewayService;
  let libsService: LibsService;
  let contractService: ContractService;
  let collectionService: CollectionService;

  async function cleanup() {
    await AssetAsEthAccount.destroy({ truncate: true, cascade: true });
    await Asset.destroy({ truncate: true, cascade: true });
    await EthAccount.destroy({ truncate: true, cascade: true });
    await Contract.destroy({ truncate: true, cascade: true });
    await Blockchain.destroy({ truncate: true, cascade: true });
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register(),
        ThirdPartyApiModule,
        TestSequelizeModule.forRootAsync(entities),
        TraitModule,
        SequelizeModule.forFeature(entities),
      ],
      providers: [
        AssetService,
        AssetExtraService,
        GatewayService,
        TraitService,
        LibsService,
        CollectionService,
        ContractService,
        ...providers,
      ],
    })
      .overrideProvider(GatewayService)
      .useValue(gatewayMock)
      .overrideProvider(LibsService)
      .useValue(libsServiceMock)
      .overrideProvider(ContractService)
      .useValue(contractServiceMock)
      .compile();

    service = module.get<AssetService>(AssetService);
    gatewayService = module.get<GatewayService>(GatewayService);
    libsService = module.get<LibsService>(LibsService);
    contractService = module.get<ContractService>(ContractService);
    collectionService = module.get<CollectionService>(CollectionService);

    await cleanup();

    await seeder.down({ to: 0 as const });
    await seeder.up();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(gatewayService).toBeDefined();
  });

  describe('find', () => {
    it('should find data', async () => {
      const account = await Account.create({
        email: 'collection@lootex.io',
        username: 'collection',
      });
      libsService.findChainShortNameByChainId = jest
        .fn()
        .mockResolvedValue('ETH');
      gatewayService.getContractOwnerOnChain = jest.fn().mockResolvedValue([
        {
          ownerAddress: 'aaaaa',
          contractAddress: 'bbbbbb',
        },
      ]);
      contractService.getContractOwner = jest
        .fn()
        .mockResolvedValue('1231231232');
      gatewayService.getNftsByOwner = jest.fn().mockResolvedValueOnce({
        total: 2,
        cursor: '',
        result: [
          {
            tokenId: tokenId1,
            contract: contract1,
            owner: {
              ownerAddress: ownerAddress1,
              amount: token1Amount,
            },
            tokenUri: tokenUri1,
            metadata: metadata1,
          },
          {
            tokenId: tokenId2,
            contract: contract2,
            owner: {
              ownerAddress: ownerAddress1,
              amount: token2Amount,
            },
            tokenUri: tokenUri2,
            metadata: metadata1,
          },
        ],
      });
      libsService.parseAnimationType = jest
        .fn()
        .mockReturnValue(mimeTypes.lookup(metadata1.animation_url));
      collectionService.updateCollectionOwnerAccountId = jest.fn();
      collectionService.getCollectionContractOwnerAddress = jest
        .fn()
        .mockResolvedValue(ownerAddress1);
      collectionService.getAccountIdByAddress = jest
        .fn()
        .mockResolvedValue(account.id);
      service.getAssetCollection = jest.fn().mockResolvedValue({
        name: contract1.name,
        description: 'test',
        ownerAddress: ownerAddress1,
      });
      gatewayService.getAssetTotalOwners = jest.fn().mockResolvedValue(1);

      await service.updateAssetsByQueue({
        ownerAddress: ownerAddress1,
        chainId: chainId1,
      });

      const limit = 10;
      const page = 1;

      const result = await service.find({
        ownerAddress: ownerAddress1,
        chainId: chainId1,
        limit,
        page,
      });
      expect(result.count).toBe(2);
      expect(result.rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            AssetAsEthAccount: [
              expect.objectContaining({
                id: expect.any(String),
                Wallet: null,
                assetId: expect.any(String),
                ownerAddress: ownerAddress1,
                quantity: token1Amount,
                createdAt: expect.any(Date),
                deletedAt: null,
                updatedAt: expect.any(Date),
              }),
            ],
            Contract: expect.objectContaining({
              address: contract2.contractAddress,
              blockchainId: expect.any(String),
              chainId: Number(chainId1),
              id: expect.any(String),
              name: contract2.name,
              schemaName: contract2.contractType,
              slug: contract2.contractAddress,
              symbol: contract2.symbol,
              updatedAt: expect.anything(),
              createdAt: expect.anything(),
              deletedAt: null,
              description: null,
              externalUrl: null,
              iconUrl: null,
              imageUrl: null,
            }),
            Xtraits: [],
            animationUrl: metadata1.animation_url,
            backgroundColor: metadata1.background_color,
            chainId: 1,
            contractId: expect.any(String),
            description: metadata1.description,
            externalUrl: metadata1.externalUrl,
            id: expect.any(String),
            imageUrl: metadata1.imageUrl,
            ownerEthAccountId: expect.any(String),
            statusOnChain: 'NONE',
            tokenId: tokenId2,
            tokenUri: tokenUri2,
            totalAmount: '1',
            totalOwners: 1,
            traits: metadata1.attributes,
            updatedAt: expect.anything(),
            animationType: 'image/png',
            createdAt: expect.anything(),
            data: null,
            deletedAt: null,
            googleImageUrl: '',
            imagePreviewUrl: '',
            lastUpdatedAt: null,
            name: '',
          }),
          expect.objectContaining({
            AssetAsEthAccount: [
              expect.objectContaining({
                id: expect.any(String),
                Wallet: null,
                assetId: expect.any(String),
                ownerAddress: ownerAddress1,
                quantity: token1Amount,
                createdAt: expect.any(Date),
                deletedAt: null,
                updatedAt: expect.any(Date),
              }),
            ],
            Contract: expect.objectContaining({
              address: contract1.contractAddress,
              blockchainId: expect.any(String),
              chainId: Number(chainId1),
              id: expect.any(String),
              name: contract1.name,
              schemaName: contract1.contractType,
              slug: contract1.contractAddress,
              symbol: contract1.symbol,
              updatedAt: expect.anything(),
              createdAt: expect.anything(),
              deletedAt: null,
              description: null,
              externalUrl: null,
              iconUrl: null,
              imageUrl: null,
            }),
            Xtraits: [],
            animationUrl: metadata1.animation_url,
            backgroundColor: metadata1.background_color,
            chainId: Number(chainId1),
            contractId: expect.any(String),
            description: metadata1.description,
            externalUrl: metadata1.externalUrl,
            id: expect.any(String),
            imageUrl: metadata1.imageUrl,
            ownerEthAccountId: expect.any(String),
            statusOnChain: 'NONE',
            tokenId: tokenId1,
            tokenUri: tokenUri1,
            totalAmount: '1',
            totalOwners: 1,
            traits: metadata1.attributes,
            updatedAt: expect.anything(),
            animationType: 'image/png',
            createdAt: expect.anything(),
            data: null,
            deletedAt: null,
            googleImageUrl: '',
            imagePreviewUrl: '',
            lastUpdatedAt: null,
            name: '',
          }),
        ]),
      );
    });
  });

  describe('updateAssetsByQueue', () => {
    let testData;
    beforeEach(async () => {
      jest.resetAllMocks();

      // -------------------------------------------
      // When call service.updateAssetsByQueue(), using This Case to Test
      // 1/ owner1 | ERC1155 amount:56 | ERC721 amount:1
      // 2/ owner2 | ERC1155 amount:87 | ERC721 amount:1
      // 3/ owner2 | ERC1155 amount:10
      testData = jest
        .fn()
        .mockResolvedValueOnce({
          total: 2,
          cursor: '',
          result: [
            {
              tokenId: tokenId1,
              contract: contract1,
              owner: {
                ownerAddress: ownerAddress1,
                amount: '56',
              },
              tokenUri: tokenUri1,
              metadata: metadata1,
            },
            {
              tokenId: tokenId1,
              contract: contract2,
              owner: {
                ownerAddress: ownerAddress1,
                amount: '1',
              },
              tokenUri: tokenUri2,
              metadata: metadata1,
            },
          ],
        })
        .mockResolvedValueOnce({
          total: 1,
          cursor: '',
          result: [
            {
              tokenId: tokenId1,
              contract: contract1,
              owner: {
                ownerAddress: ownerAddress2,
                amount: '87',
              },
              tokenUri: tokenUri1,
              metadata: metadata1,
            },
            {
              tokenId: tokenId2,
              contract: contract2,
              owner: {
                ownerAddress: ownerAddress2,
                amount: '1',
              },
              tokenUri: tokenUri2,
              metadata: metadata1,
            },
          ],
        })
        .mockResolvedValueOnce({
          total: 1,
          cursor: '',
          result: [
            {
              tokenId: tokenId1,
              contract: contract1,
              owner: {
                ownerAddress: ownerAddress2,
                amount: '10',
              },
              tokenUri: tokenUri1,
              metadata: metadata1,
            },
          ],
        });
    });

    it('should update data from gateway', async () => {
      gatewayService.getNftsByOwner = testData;
      libsService.parseAnimationType = jest
        .fn()
        .mockReturnValue(mimeTypes.lookup(metadata1.animation_url));
      gatewayService.getAssetTotalOwners = jest.fn().mockResolvedValue(1);

      await service.updateAssetsByQueue({
        ownerAddress: ownerAddress1,
        chainId: chainId1,
      });

      const user = await EthAccount.findOne({
        where: { address: ownerAddress1 },
      });
      expect(user?.address).toBe(ownerAddress1);
      const contract = await Contract.findOne({
        where: { address: contract1.contractAddress },
      });
      expect(contract.address).toBe(contract1.contractAddress);
      expect(contract.schemaName).toBe(contract1.contractType);
      expect(contract.chainId.toString()).toBe(chainId1);

      const assets = await Asset.findAll({
        where: {
          contract_id: contract.id,
          token_id: tokenId1,
          chainId: parseInt(chainId1, 10),
        },
      });
      expect(assets).toMatchObject([
        {
          Xtraits: [],
          animationType: 'image/png',
          animationUrl: metadata1.animation_url,
          backgroundColor: metadata1.background_color,
          chainId: parseInt(chainId1, 10),
          contractId: contract.id,
          description: metadata1.description,
          externalUrl: metadata1.externalUrl,
          imageUrl: metadata1.imageUrl,
          name: '',
          ownerEthAccountId: user.id,
          statusOnChain: 'NONE',
          tokenId: tokenId1,
          tokenUri: tokenUri1,
          traits: metadata1.attributes,
        },
      ]);

      const assetAsEth = await AssetAsEthAccount.findOne({
        where: {
          asset_id: assets[0].id,
          ownerAddress: ownerAddress1,
        },
      });

      expect(assetAsEth).toMatchObject({
        assetId: assets[0].id,
        ethAccountId: user.id,
        ownerAddress: ownerAddress1,
        quantity: '56',
      });
    });

    it('should update diff owner data', async () => {
      gatewayService.getNftsByOwner = testData;
      libsService.parseAnimationType = jest
        .fn()
        .mockReturnValue(mimeTypes.lookup(metadata1.animation_url));
      gatewayService.getAssetTotalOwners = jest.fn().mockResolvedValue(1);

      // asset_as_eth_account
      // asset,  owner, quantity
      //  1155, owner1, 56
      //   721, owner1, 1 <--delete
      //  1155, owner2, 87
      //   721, owner2, 1
      await service.updateAssetsByQueue({
        ownerAddress: ownerAddress1,
        chainId: chainId1,
      });
      await service.updateAssetsByQueue({
        ownerAddress: ownerAddress2,
        chainId: chainId1,
      });

      const contract1155 = await Contract.findOne({
        where: { address: contract1.contractAddress },
      });
      const contract721 = await Contract.findOne({
        where: { address: contract2.contractAddress },
      });

      const asset1155 = await Asset.findOne({
        where: {
          token_id: tokenId1,
          contract_id: contract1155.id,
          chainId: parseInt(chainId1, 10),
        },
      });
      const asset721 = await Asset.findOne({
        where: {
          token_id: tokenId2,
          contract_id: contract721.id,
          chainId: parseInt(chainId1, 10),
        },
      });

      const owner1Asset1155 = await AssetAsEthAccount.findOne({
        where: {
          ownerAddress: ownerAddress1,
          asset_id: asset1155.id,
        },
      });
      const owner1Asset721 = await AssetAsEthAccount.findOne({
        where: {
          ownerAddress: ownerAddress1,
          asset_id: asset721.id,
        },
      });
      const owner2Asset1155 = await AssetAsEthAccount.findOne({
        where: {
          ownerAddress: ownerAddress2,
          asset_id: asset1155.id,
        },
      });
      const owner2Asset721 = await AssetAsEthAccount.findOne({
        where: {
          ownerAddress: ownerAddress2,
          asset_id: asset721.id,
        },
      });

      expect(owner1Asset1155.quantity).toBe('56');
      expect(owner1Asset721).toBeNull();
      expect(owner2Asset1155.quantity).toBe('87');
      expect(owner2Asset721.quantity).toBe('1');
    });

    it('should delete transfer out asset_as_eth_account', async () => {
      libsService.parseAnimationType = jest
        .fn()
        .mockReturnValue(mimeTypes.lookup(metadata1.animation_url));

      gatewayService.getNftsByOwner = testData;
      gatewayService.getAssetTotalOwners = jest.fn().mockResolvedValue(1);

      // owner1 721 asset transfer out
      // asset_as_eth_account
      // asset,  owner, quantity
      //  1155, owner2, 87 <-- update 10
      //   721, owner2, 1 <-- delete
      await service.updateAssetsByQueue({
        ownerAddress: ownerAddress1,
        chainId: chainId1,
      });
      await service.updateAssetsByQueue({
        ownerAddress: ownerAddress1,
        chainId: chainId1,
      });
      await service.updateAssetsByQueue({
        ownerAddress: ownerAddress2,
        chainId: chainId1,
      });

      const contract1155 = await Contract.findOne({
        where: { address: contract1.contractAddress },
      });

      const contract721 = await Contract.findOne({
        where: { address: contract2.contractAddress },
      });

      const asset1155 = await Asset.findOne({
        where: {
          token_id: tokenId1,
          contract_id: contract1155.id,
          chainId: parseInt(chainId1, 10),
        },
      });
      const asset721 = await Asset.findOne({
        where: {
          token_id: tokenId1,
          contract_id: contract721.id,
          chainId: parseInt(chainId1, 10),
        },
      });

      const assetAsEthOwner2Asset1155 = await AssetAsEthAccount.findOne({
        where: {
          ownerAddress: ownerAddress2,
          asset_id: asset1155.id,
        },
      });
      const assetAsEthOwner2Asset721 = await AssetAsEthAccount.findOne({
        where: {
          ownerAddress: ownerAddress2,
          asset_id: asset721.id,
        },
      });

      expect(assetAsEthOwner2Asset1155.quantity).toBe('10');
      expect(assetAsEthOwner2Asset721).toBeNull();
    });
  });
});
