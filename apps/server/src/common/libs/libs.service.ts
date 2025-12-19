import { Injectable, Logger } from '@nestjs/common';
import * as mimeTypes from 'mime-types';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IPFS_GATEWAY } from '@/common/utils/constants';
import { Blockchain } from '@/model/entities';
import { InjectModel } from '@nestjs/sequelize';
import { Cacheable } from '../decorator/cacheable.decorator';

export enum MoralisQueryChain {
  ETH = 'eth',
  ROPSTEN = 'ropsten',
  RINKEBY = 'rinkeby',
  GOERLI = 'goerli',
  KOVAN = 'kovan',
  POLYGON = 'polygon',
  MUMBAI = 'mumbai',
  BSC = 'bsc',
  BSC_TESTNET = 'bsc testnet',
  AVALANCHE = 'avalanche',
  AVALANCHE_TESTNET = 'avalanche testnet',
  FANTOM = 'fantom',
  CRONOS = 'cronos',
  CRONOS_TESTNET = 'cronos testnet',
  ARBITRUM = 'arbitrum',
  ARBITRUM_TESTNET = 'arbitrum',
  BASE = 'base',
  HOLESKY = 'holesky',
  SONEIUM = 'soneium',
  SONEIUM_MINATO = 'soneium minato',
}

export enum RpcQueryChain {
  ETH = 'ETHEREUM',
  RINKEBY = 'RINKEBY',
  GOERLI = 'GOERLI',
  POLYGON = 'POLYGON',
  MUMBAI = 'MUMBAI',
  BSC = 'BSC',
  BSC_TESTNET = 'BSC_TESTNET',
  AVALANCHE = 'AVALANCHE',
  AVALANCHE_TESTNET = 'AVALANCHE_TESTNET',
  ARBITRUM = 'ARBITRUM',
  ARBITRUM_TESTNET = 'ARBITRUM_TESTNET',
  MANTLE = 'MANTLE',
  MANTLE_TESTNET = 'MANTLE_TESTNET',
  BASE = 'BASE',
  HOLESKY = 'HOLESKY',
  SONEIUM = 'SONEIUM',
  SONEIUM_MINATO = 'SONEIUM_MINATO',
}

type CHAIN = {
  RPC: RpcQueryChain;
  MORALIS?: MoralisQueryChain;
  id: string;
};

type CHAINMAP = {
  [key in Chain]: CHAIN;
};

export enum Chain {
  ETH = 'eth',
  RINKEBY = 'rinkeby',
  GOERLI = 'goerli',
  POLYGON = 'polygon',
  MUMBAI = 'mumbai',
  BSC = 'bsc',
  BSC_TESTNET = 'bsc_testnet',
  AVALANCHE = 'avalanche',
  AVALANCHE_TESTNET = 'avalanche_testnet',

  MANTLE = 'mantle',
  MANTLE_TESTNET = 'mantle_testnet',

  // rpc
  ARBITRUM = 'arbitrum',
  ARBITRUM_TESTNET = 'arbitrum_testnet',

  BASE = 'base',
  HOLESKY = 'holesky',

  SONEIUM = 'soneium',
  SONEIUM_MINATO = 'soneium_minato',
}

export const ChainMap: CHAINMAP = {
  [Chain.ETH]: {
    RPC: RpcQueryChain.ETH,
    MORALIS: MoralisQueryChain.ETH,
    id: '1',
  },
  [Chain.RINKEBY]: {
    RPC: RpcQueryChain.RINKEBY,
    MORALIS: MoralisQueryChain.RINKEBY,
    id: '4',
  },
  [Chain.GOERLI]: {
    RPC: RpcQueryChain.GOERLI,
    MORALIS: MoralisQueryChain.GOERLI,
    id: '5',
  },
  [Chain.POLYGON]: {
    RPC: RpcQueryChain.POLYGON,
    MORALIS: MoralisQueryChain.POLYGON,
    id: '137',
  },
  [Chain.MUMBAI]: {
    RPC: RpcQueryChain.MUMBAI,
    MORALIS: MoralisQueryChain.MUMBAI,
    id: '80001',
  },
  [Chain.BSC]: {
    RPC: RpcQueryChain.BSC,
    MORALIS: MoralisQueryChain.BSC,
    id: '56',
  },
  [Chain.BSC_TESTNET]: {
    RPC: RpcQueryChain.BSC_TESTNET,
    MORALIS: MoralisQueryChain.BSC_TESTNET,
    id: '97',
  },
  [Chain.AVALANCHE]: {
    RPC: RpcQueryChain.AVALANCHE,
    MORALIS: MoralisQueryChain.AVALANCHE,
    id: '43114',
  },
  [Chain.AVALANCHE_TESTNET]: {
    RPC: RpcQueryChain.AVALANCHE_TESTNET,
    MORALIS: MoralisQueryChain.AVALANCHE_TESTNET,
    id: '43113',
  },
  [Chain.ARBITRUM]: {
    RPC: RpcQueryChain.ARBITRUM,
    MORALIS: MoralisQueryChain.ARBITRUM,
    id: '42161',
  },
  [Chain.ARBITRUM_TESTNET]: {
    RPC: RpcQueryChain.ARBITRUM_TESTNET,
    MORALIS: MoralisQueryChain.ARBITRUM_TESTNET,
    id: '421611',
  },
  [Chain.MANTLE]: {
    RPC: RpcQueryChain.MANTLE,
    id: '5000',
  },
  [Chain.MANTLE_TESTNET]: {
    RPC: RpcQueryChain.MANTLE_TESTNET,
    id: '5001',
  },
  [Chain.BASE]: {
    RPC: RpcQueryChain.BASE,
    MORALIS: MoralisQueryChain.BASE,
    id: '8453',
  },
  [Chain.HOLESKY]: {
    RPC: RpcQueryChain.HOLESKY,
    MORALIS: MoralisQueryChain.HOLESKY,
    id: '17000',
  },
  [Chain.SONEIUM]: {
    RPC: RpcQueryChain.SONEIUM,
    MORALIS: MoralisQueryChain.SONEIUM,
    id: '1868',
  },
  [Chain.SONEIUM_MINATO]: {
    RPC: RpcQueryChain.SONEIUM_MINATO,
    MORALIS: MoralisQueryChain.SONEIUM_MINATO,
    id: '1946',
  },
};

export const ChainIdMap = {
  '1': Chain.ETH,
  '4': Chain.RINKEBY,
  '5': Chain.GOERLI,
  '137': Chain.POLYGON,
  '80001': Chain.MUMBAI,
  '56': Chain.BSC,
  '97': Chain.BSC_TESTNET,
  '43114': Chain.AVALANCHE,
  '43113': Chain.AVALANCHE_TESTNET,
  '42161': Chain.ARBITRUM,
  '421611': Chain.ARBITRUM_TESTNET,
  '5000': Chain.MANTLE,
  '5001': Chain.MANTLE_TESTNET,
  '8453': Chain.BASE,
  '1946': Chain.SONEIUM_MINATO,
  '1868': Chain.SONEIUM,
};

export const ChainIdMappingSymbol = {
  '1': 'ETH',
  '5': 'ETH',
  '56': 'BNB',
  '97': 'BNB',
  '137': 'MATIC',
  '5000': 'MNT',
  '80001': 'MATIC',
  '43114': 'AVAX',
  '43113': 'AVAX',
  '42161': 'ETH',
  '421613': 'ETH',
  '8453': 'ETH',
  '1946': 'ETH',
  '1868': 'ETH',
};

export const ChainShortNameMappingSymbol = {
  eth: 'ETH',
  rin: 'ETH',
  bnb: 'BNB',
  bnbt: 'BNB',
  matic: 'MATIC',
  maticmum: 'MATIC',
  Avalanche: 'AVAX',
  Fuji: 'AVAX',
  mnt: 'MNT',
  base: 'ETH',
  arb1: 'ETH',
  soneium: 'ETH',
  'soneium-minato': 'ETH',
};

export const ChainPerBlockTime = {
  '1': 12, // eth https://etherscan.io/chart/blocktime
  '5': 12,
  '56': 3, // bsc https://www.google.com/search?q=bnb+average+block+time
  '97': 3,
  '137': 2, // polygon https://polygonscan.com/chart/blocktime
  '80001': 2,
  '43114': 2, // avalanche https://snowtrace.io/
  '43113': 2,
  '42161': 0.26, // arbitrum https://officercia.mirror.xyz/d798TVQyA1ALq3qr1R9vvujdF7x-erXxK2wQWwbgRKY#:~:text=Arbitrum%20average%20block%20time%3A%20~0.26s%3B
  '421611': 0.26,
  '5000': 0.35, // mantle https://docs.mantle.xyz/network/introduction/faqs, https://explorer.mantle.xyz/blocks
  '5001': 0.35,
  '8453': 2,
  '1946': 0.5,
  '1868': 0.5,
};

export const BlockchainExplorer = {
  [Chain.ETH]: 'https://etherscan.io',
  [Chain.BSC]: 'https://bscscan.com',
  [Chain.POLYGON]: 'https://polygonscan.com',
  [Chain.ARBITRUM]: 'https://arbiscan.io',
  [Chain.AVALANCHE]: 'https://snowtrace.io/',
  [Chain.MANTLE]: 'https://explorer.mantle.xyz/',
  [Chain.BASE]: 'https://explorer.base.xyz/',
  [Chain.SONEIUM]: 'https://explorer-testnet.soneium.org/',
  [Chain.SONEIUM_MINATO]: 'https://explorer-testnet.soneium.org/',
};

export const TestnetChainIds = [4, 5, 97, 80001, 43113, 421611, 5001, 1946];

@Injectable()
export class LibsService {
  protected readonly logger = new Logger(LibsService.name);

  constructor(
    private readonly httpService: HttpService,

    @InjectModel(Blockchain)
    private blockchainRepository: typeof Blockchain,
  ) {}

  async sleep(time: number): Promise<void> {
    return new Promise<void>((res, rej) => {
      setTimeout(res, time);
    });
  }

  async parseAnimationType(animationUrl?: string): Promise<string | false> {
    try {
      if (!animationUrl) {
        return 'unknown';
      }
      if (
        animationUrl.startsWith('https://www.sandbox.game/model-viewer-light/')
      ) {
        return 'text/html';
      }

      let mimeType = mimeTypes.lookup(animationUrl);
      if (!mimeType) {
        try {
          const url = animationUrl.startsWith('ipfs://')
            ? animationUrl.replace('ipfs://', IPFS_GATEWAY)
            : animationUrl;

          const res = await firstValueFrom(this.httpService.head(url));

          mimeType = res.headers['content-type'];
        } catch (error) {
          this.logger.error(error);
        }
      }
      return mimeType;
    } catch (error) {
      this.logger.error(`animationUrl = ${animationUrl}`);
      this.logger.error(error);
      return Promise.resolve('unknown');
    }
  }

  @Cacheable({
    seconds: 60 * 60,
    key: 'findChainShortNameByChainId',
  })
  async findChainShortNameByChainId(chainId: string | number): Promise<string> {
    try {
      const blockChain = await this.blockchainRepository.findOne({
        where: {
          chainId,
        },
      });
      return blockChain ? blockChain.shortName : 'None';
    } catch (err) {
      this.logger.debug(err);
      return Promise.reject(err);
    }
  }

  @Cacheable({
    seconds: 60 * 60,
    key: 'findChainIdByChainShortName',
  })
  async findChainIdByChainShortName(chainShortName: string): Promise<string> {
    try {
      const blockChain = await this.blockchainRepository.findOne({
        where: {
          shortName: chainShortName,
        },
      });
      return blockChain ? blockChain.chainId + '' : '0';
    } catch (err) {
      this.logger.debug(err);
      return Promise.reject(err);
    }
  }

  async getSymbolFromChainId(chainId: string | number): Promise<string> {
    try {
      const symbol = ChainIdMappingSymbol[chainId];
      return symbol || 'NONE';
    } catch (err) {
      this.logger.debug(err);
      return Promise.reject(err);
    }
  }

  getSymbolFromChainShortName(chainShortName: string): Promise<string> {
    try {
      const symbol = ChainShortNameMappingSymbol[chainShortName];
      return symbol || 'NONE';
    } catch (err) {
      this.logger.debug(err);
      return Promise.reject(err);
    }
  }
}
