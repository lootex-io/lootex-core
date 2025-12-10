import { TraitService } from '@/api/v3/trait/trait.service';
import * as casual from 'casual';
import * as crypto from 'crypto';
// import { QueueService } from '@/common/queue/queue.service';
import { ThirdPartyApiModule } from '@/third-party-api/thirdPartyApi.module';
import { AssetService } from '@/api/v3/asset/asset.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AssetController } from '@/api/v3/asset/asset.controller';
import { GatewayService } from '@/third-party-api/gateway/gateway.service';
import { CacheModule } from '@/common/cache';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { QueueService } from '@/external/queue/queue.service';
import {
  entities,
  AssetAsEthAccount,
  Asset,
  EthAccount,
  Contract,
  Blockchain,
  Wallet,
  Account,
} from '@/model/entities';
import { providers } from '@/model/providers';
import { JwtService } from '@nestjs/jwt';
import { AuthJwtGuard } from '@/api/v3/auth/auth.jwt.guard';
import {
  AuthSupportedWalletTransport,
  AuthSupportedWalletProviderEnum,
  AuthSupportedChainFamily,
} from '@/api/v3/auth/auth.interface';
import { QUEUE_STATUS } from '@/common/utils';
import { mockPassGuard } from '@/../test/utils/auth.guard.mock';
import { TestSequelizeModule } from '@/../test/utils/sequelize.test.module';
import { seeder } from '@/../test/utils/seeder';
import * as mimeTypes from 'mime-types';
import { TraitModule } from '@/api/v3/trait/trait.module';
import { AssetExtraService } from '@/api/v3/asset/asset-extra.service';
import { SequelizeModule } from '@nestjs/sequelize';

jest.mock('@/common/queue/queue.service');

const gatewayMock = jest.mock('@/third-party-api/gateway/gateway.service');
const libsServiceMock = jest.mock('@/common/libs/libs.service');
const QueueServiceMock = jest.mock('@/external/queue/queue.service');

const chainId1 = '1';

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

describe('AssetController', () => {
  let controller: AssetController;
  let service: AssetService;
  let gatewayService: GatewayService;
  let libsService: LibsService;
  let contractService: ContractService;
  let queueService: QueueService;
  let collectionService: CollectionService;

  async function cleanup() {
    await AssetAsEthAccount.destroy({ truncate: true, cascade: true });
    await Asset.destroy({ truncate: true, cascade: true });
    await EthAccount.destroy({ truncate: true, cascade: true });
    await Contract.destroy({ truncate: true, cascade: true });
    await Blockchain.destroy({ truncate: true, cascade: true });
    await Wallet.destroy({ truncate: true, cascade: true });
    await Account.destroy({ truncate: true, cascade: true });
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
        QueueService,
        JwtService,
        GatewayService,
        TraitService,
        LibsService,
        CollectionService,
        ContractService,
        ...providers,
      ],
      controllers: [AssetController],
    })
      .overrideGuard(AuthJwtGuard)
      .useValue(mockPassGuard)
      .overrideProvider(GatewayService)
      .useValue(gatewayMock)
      .overrideProvider(LibsService)
      .useValue(libsServiceMock)
      .overrideProvider(QueueService)
      .useValue(QueueServiceMock)
      .compile();

    controller = module.get<AssetController>(AssetController);
    service = module.get<AssetService>(AssetService);
    gatewayService = module.get<GatewayService>(GatewayService);
    libsService = module.get<LibsService>(LibsService);
    contractService = module.get<ContractService>(ContractService);
    queueService = module.get<QueueService>(QueueService);
    collectionService = module.get<CollectionService>(CollectionService);

    await cleanup();

    await seeder.down({ to: 0 as const });
    await seeder.up();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
    expect(gatewayService).toBeDefined();
  });

  describe('GET /assets', () => {
    it('should get asset list', async () => {
      const account = await Account.create({
        email: casual.email,
        username: casual.full_name,
      });
      queueService.sendMessageToSqs = jest.fn().mockResolvedValueOnce('');
      libsService.findChainShortNameByChainId = jest
        .fn()
        .mockResolvedValue('ETH');
      contractService.getContractOwner = jest
        .fn()
        .mockResolvedValue('1231231232');
      const ownerAddress = '0x17FF6D06be2A511A57D119c189Fe4391f84A742c';
      gatewayService.getNftsByOwner = jest.fn().mockResolvedValue({
        total: 2,
        cursor: '',
        result: [
          {
            tokenId: tokenId1,
            contract: contract1,
            owner: {
              ownerAddress,
              amount: token1Amount,
            },
            tokenUri: tokenUri1,
            metadata: metadata1,
          },
          {
            tokenId: tokenId2,
            contract: contract2,
            owner: {
              ownerAddress,
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
        .mockResolvedValue(ownerAddress);
      collectionService.getAccountIdByAddress = jest
        .fn()
        .mockResolvedValue(account.id);
      service.getAssetCollection = jest.fn().mockResolvedValue({
        name: contract1.name,
        description: 'test',
        ownerAddress: '0xtesttesttesttesttesttesttesttesttesttest',
      });
      gatewayService.getAssetTotalOwners = jest.fn().mockResolvedValue(1);

      await service.updateAssetsByQueue({
        ownerAddress,
        chainId: chainId1,
      });

      const limit = 10;
      const page = 1;
      const { queueStatus, rows, count } = await controller.getAssets({
        collectionSlug: null,
        ownerAddress,
        chainId: chainId1,
        limit,
        page,
        traits: null,
      });

      expect(queueStatus).toBe(QUEUE_STATUS.PENDING);
      expect(count).toBe(2);
      expect(rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            AssetAsEthAccount: [
              expect.objectContaining({
                id: expect.any(String),
                Wallet: null,
                assetId: expect.any(String),
                ownerAddress,
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
              id: expect.anything(),
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
                ownerAddress,
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
              id: expect.anything(),
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

  describe('GET /assets/me', () => {
    it('should get asset list', async () => {
      queueService.sendMessageToSqs = jest.fn().mockResolvedValueOnce('');
      libsService.findChainShortNameByChainId = jest
        .fn()
        .mockResolvedValue('ETH');
      contractService.getContractOwner = jest
        .fn()
        .mockResolvedValue('1231231232');
      const account = await Account.create({
        email: casual.email,
        username: casual.full_name,
      });
      const wallet = await Wallet.create({
        accountId: account.id,
        transport: AuthSupportedWalletTransport.INJECTED,
        provider: AuthSupportedWalletProviderEnum.METAMASK_INJECTED,
        chainFamily: AuthSupportedChainFamily.ETH,
        address: crypto.randomBytes(32).toString('hex'),
        isMainWallet: true,
      });

      gatewayService.getNftsByOwner = jest.fn().mockResolvedValue({
        total: 2,
        cursor: '',
        result: [
          {
            tokenId: tokenId1,
            contract: contract1,
            owner: {
              ownerAddress: wallet.address,
              amount: '56',
            },
            tokenUri: tokenUri1,
            metadata: metadata1,
          },
          {
            tokenId: tokenId2,
            contract: contract2,
            owner: {
              ownerAddress: wallet.address,
              amount: '1',
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
        .mockResolvedValue(wallet.address);
      collectionService.getAccountIdByAddress = jest
        .fn()
        .mockResolvedValue(account.id);
      service.getAssetCollection = jest.fn().mockResolvedValue({
        name: contract1.name,
        description: 'test',
        ownerAddress: '0xtesttesttesttesttesttesttesttesttesttest',
      });
      gatewayService.getAssetTotalOwners = jest.fn().mockResolvedValue(1);

      await service.updateAssetsByQueue({
        ownerAddress: wallet.address,
        chainId: chainId1,
      });

      const limit = 10;
      const page = 1;

      const { queueStatus, rows, count } = await controller.myAssets(
        {
          chainId: chainId1,
          limit,
          page,
        },
        account,
        wallet,
      );

      expect(queueStatus).toBe(QUEUE_STATUS.PENDING);
      expect(count).toBe(2);
      // expect(rows).toMatchObject([
      //   {
      //     Contract: {
      //       address: contract1.contractAddress,
      //       blockchainId: expect.any(String),
      //       chainId: Number(chainId1),
      //       id: expect.any(String),
      //       name: contract1.name,
      //       schemaName: contract1.contractType,
      //       slug: contract1.contractAddress,
      //       symbol: contract1.symbol,
      //       updatedAt: expect.anything(),
      //       createdAt: expect.anything(),
      //       deletedAt: null,
      //       description: null,
      //       externalUrl: null,
      //       iconUrl: null,
      //       imageUrl: null,
      //     },
      //     Xtraits: [],
      //     animationUrl: metadata1.animation_url,
      //     backgroundColor: metadata1.background_color,
      //     chainId: Number(chainId1),
      //     contractId: expect.any(String),
      //     description: metadata1.description,
      //     externalUrl: metadata1.externalUrl,
      //     id: expect.any(String),
      //     imageUrl: metadata1.imageUrl,
      //     ownerEthAccountId: expect.any(String),
      //     statusOnChain: 'NONE',
      //     tokenId: tokenId1,
      //     tokenUri: tokenUri1,
      //     totalAmount: '1',
      //     totalOwners: 1,
      //     traits: metadata1.attributes,
      //     updatedAt: expect.anything(),
      //   },
      //   {
      //     Contract: {
      //       address: contract2.contractAddress,
      //       blockchainId: expect.any(String),
      //       chainId: Number(chainId1),
      //       id: expect.any(String),
      //       name: contract2.name,
      //       schemaName: contract2.contractType,
      //       slug: contract2.contractAddress,
      //       symbol: contract2.symbol,
      //       updatedAt: expect.anything(),
      //       createdAt: expect.anything(),
      //       deletedAt: null,
      //       description: null,
      //       externalUrl: null,
      //       iconUrl: null,
      //       imageUrl: null,
      //     },
      //     Xtraits: [],
      //     animationUrl: metadata1.animation_url,
      //     backgroundColor: metadata1.background_color,
      //     chainId: 1,
      //     contractId: expect.any(String),
      //     description: metadata1.description,
      //     externalUrl: metadata1.externalUrl,
      //     id: expect.any(String),
      //     imageUrl: metadata1.imageUrl,
      //     ownerEthAccountId: expect.any(String),
      //     statusOnChain: 'NONE',
      //     tokenId: tokenId2,
      //     tokenUri: tokenUri2,
      //     totalAmount: '1',
      //     totalOwners: 1,
      //     traits: metadata1.attributes,
      //     updatedAt: expect.anything(),
      //   },
      // ]);
    });
  });
});
