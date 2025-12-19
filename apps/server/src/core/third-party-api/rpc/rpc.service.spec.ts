import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { RpcService } from './rpc.service';
import { RpcQueryChain } from '@/common/libs/libs.service';
import { ConfigurationService } from '@/configuration';
import { Logger } from '@nestjs/common';
import { CWLogService } from '@/core/third-party-api/cloudwatch-log/cw-log.service';
import { CacheModule } from '@/common/cache';
import * as redisStore from 'cache-manager-ioredis';
import { CLOUDWATCH_LOGS, ContractType } from '@/common/utils';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';

describe('RpcService', () => {
  let service: RpcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        HttpModule,
        CacheModule.forRootAsync({
          useFactory: () => ({
            store: redisStore,
            host: 'localhost',
            port: '6379',
            password: '',
          }),
        }),
      ],
      providers: [
        RpcService,
        RpcHandlerService,
        {
          provide: CWLogService,
          useValue: {
            log(
              logger: Logger,
              logType: string,
              event: string,
              args: any[] = [],
            ) {
              const message = `${
                CLOUDWATCH_LOGS.CLOUDWATCH_LOGS
              } ${logType} ${event} ${args.join(' ')}`;
              console.log(message);
            },
          },
        },
        {
          provide: ConfigurationService,
          useValue: {
            get(key) {
              let node = '';
              switch (key) {
                case 'RPC_ENDPOINT_ETHEREUM':
                  node =
                    'https://eth-mainnet.blastapi.io/f6d433d4-fe67-4ed4-80f1-dc758a72789a';
                  break;
                case 'RPC_ENDPOINT_POLYGON':
                  node =
                    'https://polygon-mainnet.blastapi.io/f6d433d4-fe67-4ed4-80f1-dc758a72789a';
                  break;
                case 'RPC_ENDPOINT_BSC':
                  node =
                    'https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3';
                  break;
                case 'RPC_ENDPOINT_ARBITRUM':
                  node =
                    'https://arbitrum-one.blastapi.io/f6d433d4-fe67-4ed4-80f1-dc758a72789a';
                  break;
                case 'RPC_ENDPOINT_MANTLE':
                  node =
                    'https://mantle-mainnet.blastapi.io/f6d433d4-fe67-4ed4-80f1-dc758a72789a';
                  break;
                case 'RPC_ENDPOINT_BACKUP_MANTLE':
                  node =
                    'https://rpc.mantle.xyz, https://mantle.drpc.org, https://1rpc.io/mantle';
                  break;
              }
              return node;
            },
          },
        },
      ],
    }).compile();

    service = module.get<RpcService>(RpcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getNftByTokenIdByContract test', async () => {
    const contract = '0xcf995797cb2e65cc290e084f0127b1e8ebc692c8';
    const token = '22580';
    const nft = await service.getNftByTokenIdByContract(
      RpcQueryChain.MANTLE,
      contract,
      token,
    );
    console.log(`nft ${JSON.stringify(nft)}`);
  }, 30000);

  describe('test getErc1155BalanceOf', () => {
    it('should getBalanceOfErc1155 ERC1155', async () => {
      expect(
        await service.getErc1155BalanceOf(
          RpcQueryChain.POLYGON,
          '0xb6c7f9b23a67317b66da06005bd63d676e9e5009',
          '0xe2c8029957d65242a651177667a7F45B0b83FB92',
          '1000',
        ),
      ).toBeDefined();
      // expect(
      //   await service.getErc1155BalanceOf(
      //     RpcQueryChain.POLYGON,
      //     '0x138c5180e2af3179c7a68983401adb21c3c4ec21',
      //     '0xbd629c40d447e5d6d6f1e9b4aa56870993b39fed',
      //     '3',
      //   ),
      // ).toBeDefined();
    }, 30000);
  });

  describe('test fun _getContractType', () => {
    it('should ContractType.ERC721', async () => {
      expect(
        await service._getContractType(
          RpcQueryChain.POLYGON,
          '0x3f316061c3ded6afd876988e387de224d7dad648',
        ),
      ).toBe(ContractType.ERC721);
      expect(
        await service._getContractType(
          RpcQueryChain.POLYGON,
          '0x5d573ba88b3c65c38a47863a1c5460edc11c8323',
        ),
      ).toBe(ContractType.ERC721);
      expect(
        await service._getContractType(
          RpcQueryChain.POLYGON,
          '0x0a55591e79b75cef742e4166255a9ced8d1f1c05',
        ),
      ).toBe(ContractType.ERC721);
      expect(
        await service._getContractType(
          RpcQueryChain.ETH,
          '0x7e527e9b8aad8db0e535bcd265267594059bd529',
        ),
      ).toBe(ContractType.ERC721);
      expect(
        await service._getContractType(
          RpcQueryChain.MANTLE,
          '0x7cf4ac414c94e03ecb2a7d6ea8f79087453caef0',
        ),
      ).toBe(ContractType.ERC721);
    }, 30000);
    it('should ContractType.ERC1155 - 0', async () => {
      expect(
        await service._getContractType(
          RpcQueryChain.POLYGON,
          '0x300f496db105bed28240d4bea6acbf9a55936d7e',
        ),
      ).toBe(ContractType.ERC1155);
      expect(
        await service._getContractType(
          RpcQueryChain.MANTLE,
          '0x3803856585A7fbC6A3bCa94A0b9C49a48af90DD3',
        ),
      ).toBe(ContractType.ERC1155);
      expect(
        await service._getContractType(
          RpcQueryChain.POLYGON,
          '0x300f496db105bed28240d4bea6acbf9a55936d7e',
        ),
      ).toBe(ContractType.ERC1155);
      expect(
        await service._getContractType(
          RpcQueryChain.POLYGON,
          '0x39e1fc1f076cbf3202c3b39c6414a7a215a7e3be',
        ),
      ).toBe(ContractType.ERC1155);
    }, 30000);

    it('should ContractType.UNKNOWN - 0', async () => {
      expect(
        await service._getContractType(
          RpcQueryChain.ETH,
          '0x3f316061c3ded6afd876988e387de224d7dad648',
        ),
      ).toBe(ContractType.UNKNOWN);
    });
  });

  describe('test automatic node switching', () => {
    it('should getErc1155BalanceOf use the 2nd node', async () => {
      expect(
        await service.getErc1155BalanceOf(
          RpcQueryChain.POLYGON,
          '0xb6c7f9b23a67317b66da06005bd63d676e9e5009',
          '0xe2c8029957d65242a651177667a7F45B0b83FB92',
          '1',
        ),
      ).toBeDefined();
    });
    it('shoud getNftByTokenIdByContract use the 2nd node', async () => {
      const nft = await service.getNftByTokenIdByContract(
        RpcQueryChain.MANTLE,
        '0xcf995797cb2e65cc290e084f0127b1e8ebc692c8',
        '22580',
      );
      console.log(`nft ${JSON.stringify(nft)}`);
      expect(nft.tokenUri).toBeDefined();
    }, 30000);

    it('shoud getNftByTokenIdByContract use the 2nd node', async () => {
      const nft = await service.getNftByTokenIdByContract(
        RpcQueryChain.POLYGON,
        '0x72e0cc4f73e4bc6b209d85fee86a8cd10e04dc6a',
        '0',
      );
      console.log(`nft ${JSON.stringify(nft)}`);
      expect(nft.tokenUri).toBeDefined();
    }, 60000);

    it('shoud _getContractType use the 2nd node', async () => {
      const contractType = await service._getContractType(
        RpcQueryChain.MANTLE,
        '0xcf995797cb2e65cc290e084f0127b1e8ebc692c8',
      );
      console.log(`nft ${contractType}`);
      expect(contractType).toBe(ContractType.ERC721);
    }, 30000);
  });

  describe('test rpc retry and pool', () => {
    it('shoud _getContractType', async () => {
      const contractType = await service._getContractType(
        RpcQueryChain.MANTLE,
        '0xcf995797cb2e65cc290e084f0127b1e8ebc692c81',
      );
      console.log(`contractType ${contractType}`);
      // expect(contractType).toBe(ContractType.ERC721);
    }, 30000);

    it('getNftByTokenIdByContract test', async () => {
      const contract = '0xc799d8f3ad911a03ac1e1f93baa2e961b4047803';
      const token = '477111';
      const nft = await service.getNftByTokenIdByContract(
        RpcQueryChain.MANTLE,
        contract,
        token,
      );
      console.log(`nft ${JSON.stringify(nft)}`);
    }, 30000);

    it('nativeGetOwnerOf test', async () => {
      const res = await service.nativeGetOwnerOf(
        137,
        '0x452f1593b59777a10835fe1074bfc3351fb01e72',
        '12267',
      );
      console.log('res ', res);
    }, 30000);
  });
});
