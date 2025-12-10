import { Test, TestingModule } from '@nestjs/testing';
import { HttpModule } from '@nestjs/axios';
import { MoralisService } from './moralis.service';
import { ConfigurationModule } from '@/configuration/configuration.module';
import { ContractType } from '../gateway/constants';
import { CacheModule } from '@/common/cache';
import * as redisStore from 'cache-manager-ioredis';
import { CWLogService } from '@/core/third-party-api/cloudwatch-log/cw-log.service';
import { Logger } from '@nestjs/common';
import { CLOUDWATCH_LOGS } from '@/common/utils';
import { Chain } from '@/common/libs/libs.service';
import {
  Env,
  MoralisQueryFormat,
} from '@/core/third-party-api/moralis/constants';
import { ConfigurationService } from '@/configuration';
import { EvmChain } from '@moralisweb3/common-evm-utils';

describe('MoralisService', () => {
  let service: MoralisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        HttpModule,
        ConfigurationModule,
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
        MoralisService,
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
            get(key: string) {
              if (key === Env.MORAILS_API_KEY) {
                return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImEyZTVmYjk3LWI1NmEtNGU3Ni05ZTY0LWNkODUyYWI2YTg4OCIsIm9yZ0lkIjoiMzczODgiLCJ1c2VySWQiOiIzNzM5NiIsInR5cGVJZCI6IjhhNmRkOGIzLWQ4NDctNGM1Zi1hNmRlLTA0MWFmNGQ5MmZlNCIsInR5cGUiOiJQUk9KRUNUIiwiaWF0IjoxNjgyMzk1MDgzLCJleHAiOjQ4MzgxNTUwODN9.hZ-LfkpTxK7lGSHCACS5i7siFlNwWuWYhb9dWC_eLYw';
              } else if (key === Env.MORAILS_API_BACKUP_KEY) {
                return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImU5MDc4Y2ZkLTViYzEtNDY0MS1iZjFhLWRiYTA3ZjI4YWI3NCIsIm9yZ0lkIjoiMzY4MjY5IiwidXNlcklkIjoiMzc4NDg4IiwidHlwZUlkIjoiZjQwNTdjZGQtODkwNS00YjZkLWEwN2UtY2E0MmFiZmZjOTkxIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MDI2MDUzMjMsImV4cCI6NDg1ODM2NTMyM30.E8C7sTwmtKTZXEcqMO00bBlbngST1BwSmpkEQVia9LE';
              } else if (key === Env.MORAILS_URL) {
                return 'https://deep-index.moralis.io';
              }
              return key;
            },
          },
        },
      ],
    }).compile();

    service = module.get<MoralisService>(MoralisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('isLegal() should return true', async () => {
    const nft = {
      token_address: '0xb03f5d50c126c8a65707f6fc9cae12589bbeb4c6',
      token_id: '8117',
      owner_of: '0xa87bf2268e149ae86f064d16596a0af09f5b50ff',
      block_number: '30649217',
      block_number_minted: '30649217',
      token_hash: 'd77317c1c6c833cd8a1bbea38911a812',
      amount: '1',
      contract_type: 'ERC721',
      name: 'GF20th Adventure Pass',
      symbol: 'GF20AP',
      token_uri:
        'https://storage.qubic.market/137/0xb03f5d50c126c8a65707f6fc9cae12589bbeb4c6/8117',
      metadata:
        '{"description":"[Your key](https://apelist.tech) into the Temple of Opportunity - which gives you access to exclusive whitelists, tools, and web3 opportunities. The Ape List is a [private alpha community](https://apelist.tech) exclusive to holders of BAYC, CryptoPunks, MAYC, Moonbirds, and Meebits. PLEASE NOTE: the utility of this NFT is exclusive to the before mentioned collections.","external_url":"https://apelist.tech","animation_url":"ipfs://QmewN5YoHbtxdWCyH26eVvhtDp5YhNZsSDga3D6A97A6fP/","image":"https://ipfs.io/ipfs/QmYWpngU7UNobDmAVQYUYjoZP6xLoc8hqRvzBKjYEwQUrx","name":"APE List #830","attributes":{}}',
      last_token_uri_sync: '2022-07-12T17:25:11.229Z',
      last_metadata_sync: '2022-07-12T17:25:33.278Z',
    };

    const res = await service.isLegal(nft);

    expect(res).toEqual(true);
  });

  it('checkValidationAndLog  w/ invalid tokenUri should return true', async () => {
    const nft = {
      tokenId: '1',
      contract: {
        contractAddress: '0xf4dd946d1406e215a87029db56c69e1bcf3e1773',
        name: null,
        symbol: null,
        contractType: ContractType.ERC1155,
      },
      owner: {
        ownerAddress: '0x4c55c41bd839b3552fb2abecacfdf4a5d2879cb9',
        amount: '1',
      },
      metadata: {
        name: 'Proof of Merge',
        description:
          'Proof of Merge is a fully on-chain, non-transferable, and dynamic NFT that will change throughout The Merge. We detect The Merge on-chain by checking if the DIFFICULTY opcode returns 0 according to EIP3675. During The Merge, the current Ethereum execution layer will merge into the Beacon chain, and Ethereum will transition from Proof of Work to Proof of Stake. Proof of Merge is a collaboration between Michael Blau (x0r) and Mason Hall.',
        image: 'xxx',
        external_url: 'https://www.proofofmerge.com/',
        attributes: [
          {
            trait_type: 'Background',
            value: 'Red',
          },
        ],
      },
      tokenUri: 'Invalid uri',
      isSpam: false,
    };

    const res = await service.checkValidationAndLog(nft);

    expect(res.tokenUri).toEqual('');
  });

  it('checkValidationAndLog w/ valid tokenUri should return true', async () => {
    const validUrl = 'https://example.io/a/b/c.png';

    const nft = {
      tokenId: '1',
      contract: {
        contractAddress: '0xf4dd946d1406e215a87029db56c69e1bcf3e1773',
        name: null,
        symbol: null,
        contractType: ContractType.ERC1155,
      },
      owner: {
        ownerAddress: '0x4c55c41bd839b3552fb2abecacfdf4a5d2879cb9',
        amount: '1',
      },
      metadata: {
        name: 'Proof of Merge',
        description:
          'Proof of Merge is a fully on-chain, non-transferable, and dynamic NFT that will change throughout The Merge. We detect The Merge on-chain by checking if the DIFFICULTY opcode returns 0 according to EIP3675. During The Merge, the current Ethereum execution layer will merge into the Beacon chain, and Ethereum will transition from Proof of Work to Proof of Stake. Proof of Merge is a collaboration between Michael Blau (x0r) and Mason Hall.',
        image: 'xxx',
        external_url: validUrl,
        attributes: [
          {
            trait_type: 'Background',
            value: 'Red',
          },
        ],
      },
      tokenUri: validUrl,
      isSpam: false,
    };

    const res = await service.checkValidationAndLog(nft);

    expect(res.tokenUri).toEqual(validUrl);
  });

  it('test getNftsByContract', async () => {
    await service.getNftsByContract(
      Chain.POLYGON,
      '0x300f496db105bed28240d4bea6acbf9a55936d7e',
      100,
      '',
      MoralisQueryFormat.DECIMAL,
      (page, nfts) => {
        console.log(`page ${page} nfts ${nfts}`);
      },
    );
  }, 5000);

  it('test getWalletActivity', async () => {
    const walletAddress = '0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326';
    const res = await service.getWalletActivity(walletAddress, [
      EvmChain.ETHEREUM.hex,
    ]);
    console.log('res ', res);
  }, 5000);
  it('test getWalletStats', async () => {
    const walletAddress = '0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326';
    const res = await service.getWalletStats(
      walletAddress,
      Chain.ETH,
      // EvmChain.ETHEREUM.hex,
    );
    console.log('res ', res);
  }, 5000);

  it('test getWalletStats', async () => {
    const walletAddress = '0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326';
    const res = await service.getWalletStats(
      walletAddress,
      Chain.ETH,
      // EvmChain.ETHEREUM.hex,
    );
    console.log('res ', res);
  }, 5000);

  it('test getWalletTransactions', async () => {
    const walletAddress = '0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326';
    const res = await service.getWalletNativeTransactions(
      walletAddress,
      Chain.ETH,
      {
        start_block_number: 19039815,
        end_block_number: 19039816,
        cursor: null,
        include_internal_transaction: true,
        data_per_page: 5,
      },
    );
    console.log('res ', res);
  }, 5000);
  it('test getWalletNFTs', async () => {
    const walletAddress = '0x1f9090aaE28b8a3dCeaDf281B0F12828e676c326';
    const res = await service.getWalletNFTs(walletAddress, 'eth', {
      cursor: null,
      contract: null,
    });
    console.log('res ', res);
  }, 5000);
});
