import {
  Chain,
  MoralisQueryChain,
  RpcQueryChain,
} from '@/common/libs/libs.service';
import { EvmChain } from '@moralisweb3/common-evm-utils';

export class ChainUtil {
  // 「ETH」、「BSC」、「Polygon」、「AVAX」、「Arbitrum」、「MNT」
  static POC_CHAINS = [1, 56, 137, 43114, 42161, 5000, 8453, 1868];

  static rpcChainToChainId(chain: RpcQueryChain | string): number {
    switch (chain) {
      case RpcQueryChain.ETH:
        return 1;
      case RpcQueryChain.RINKEBY:
        return 4;
      case RpcQueryChain.GOERLI:
        return 5;
      case RpcQueryChain.POLYGON:
        return 137;
      case RpcQueryChain.MUMBAI:
        return 80001;
      case RpcQueryChain.BSC:
        return 56;
      case RpcQueryChain.BSC_TESTNET:
        return 97;
      case RpcQueryChain.AVALANCHE:
        return 43114;
      case RpcQueryChain.AVALANCHE_TESTNET:
        return 43113;
      case RpcQueryChain.ARBITRUM:
        return 42161;
      case RpcQueryChain.ARBITRUM_TESTNET:
        return 421611;
      case RpcQueryChain.MANTLE:
        return 5000;
      case RpcQueryChain.MANTLE_TESTNET:
        return 5001;
      case RpcQueryChain.BASE:
        return 8453;
      case RpcQueryChain.HOLESKY:
        return 17000;
      case RpcQueryChain.SONEIUM_MINATO:
        return 1946;
      case RpcQueryChain.SONEIUM:
        return 1868;
      default:
        return -1;
    }
  }

  static chainIdToRpcChain(chain: number): RpcQueryChain {
    switch (chain) {
      case 1:
        return RpcQueryChain.ETH;
      case 4:
        return RpcQueryChain.RINKEBY;
      case 5:
        return RpcQueryChain.GOERLI;
      case 137:
        return RpcQueryChain.POLYGON;
      case 80001:
        return RpcQueryChain.MUMBAI;
      case 56:
        return RpcQueryChain.BSC;
      case 97:
        return RpcQueryChain.BSC_TESTNET;
      case 43114:
        return RpcQueryChain.AVALANCHE;
      case 43113:
        return RpcQueryChain.AVALANCHE_TESTNET;
      case 42161:
        return RpcQueryChain.ARBITRUM;
      case 421611:
        return RpcQueryChain.ARBITRUM_TESTNET;
      case 5000:
        return RpcQueryChain.MANTLE;
      case 5001:
        return RpcQueryChain.MANTLE_TESTNET;
      case 8453:
        return RpcQueryChain.BASE;
      case 17000:
        return RpcQueryChain.HOLESKY;
      case 1868:
        return RpcQueryChain.SONEIUM;
      case 1946:
        return RpcQueryChain.SONEIUM_MINATO;
      default:
        return RpcQueryChain.ETH;
    }
  }

  static chainIdToChain(chainId: number) {
    switch (chainId) {
      case 1:
        return Chain.ETH;
      case 4:
        return Chain.RINKEBY;
      case 5:
        return Chain.GOERLI;
      case 137:
        return Chain.POLYGON;
      case 80001:
        return Chain.MUMBAI;
      case 56:
        return Chain.BSC;
      case 97:
        return Chain.BSC_TESTNET;
      case 43114:
        return Chain.AVALANCHE;
      case 43113:
        return Chain.AVALANCHE_TESTNET;
      case 42161:
        return Chain.ARBITRUM;
      case 421611:
        return Chain.ARBITRUM_TESTNET;
      case 5000:
        return Chain.MANTLE;
      case 5001:
        return Chain.MANTLE_TESTNET;
      case 8453:
        return Chain.BASE;
      case 17000:
        return Chain.HOLESKY;
      case 1868:
        return Chain.SONEIUM;
      case 1946:
        return Chain.SONEIUM_MINATO;
      default:
        return Chain.ETH;
    }
  }

  static chainIdToMoralisChain(chainId: number): string {
    switch (chainId) {
      case 1:
        return MoralisQueryChain.ETH;
      case 4:
        return MoralisQueryChain.RINKEBY;
      case 5:
        return MoralisQueryChain.GOERLI;
      case 137:
        return MoralisQueryChain.POLYGON;
      case 80001:
        return MoralisQueryChain.MUMBAI;
      case 56:
        return MoralisQueryChain.BSC;
      case 97:
        return MoralisQueryChain.BSC_TESTNET;
      case 43114:
        return MoralisQueryChain.AVALANCHE;
      case 43113:
        return MoralisQueryChain.AVALANCHE_TESTNET;
      case 42161:
        return MoralisQueryChain.ARBITRUM;
      case 421611:
        return MoralisQueryChain.ARBITRUM_TESTNET;
      // case 5000:
      //   return MoralisQueryChain.MANTLE;
      // case 5001:
      //   return MoralisQueryChain.MANTLE_TESTNET;
      case 8453:
        return MoralisQueryChain.BASE;
      case 1946:
        return MoralisQueryChain.SONEIUM_MINATO;
      case 1868:
        return MoralisQueryChain.SONEIUM;
      case 17000:
        return MoralisQueryChain.HOLESKY;
      default:
        return '';
    }
  }

  static moralisChainToChainId(moralisChain: string): number {
    switch (moralisChain) {
      case MoralisQueryChain.ETH:
        return 1;
      case MoralisQueryChain.RINKEBY:
        return 4;
      case MoralisQueryChain.GOERLI:
        return 5;
      case MoralisQueryChain.POLYGON:
        return 137;
      case MoralisQueryChain.MUMBAI:
        return 80001;
      case MoralisQueryChain.BSC:
        return 56;
      case MoralisQueryChain.BSC_TESTNET:
        return 97;
      case MoralisQueryChain.AVALANCHE:
        return 43114;
      case MoralisQueryChain.AVALANCHE_TESTNET:
        return 43113;
      case MoralisQueryChain.ARBITRUM:
        return 42161;
      case MoralisQueryChain.ARBITRUM_TESTNET:
        return 421611;
      // case MoralisQueryChain.MANTLE:
      //   return 5000;
      // case MoralisQueryChain.MANTLE_TESTNET:
      //   return 5001;
      case MoralisQueryChain.BASE:
        return 8453;
      case MoralisQueryChain.SONEIUM_MINATO:
        return 1946;
      case MoralisQueryChain.SONEIUM:
        return 1868;
      case MoralisQueryChain.HOLESKY:
        return 17000;
      default:
        return -1;
    }
  }

  static rpcPublic(chain: RpcQueryChain): string {
    switch (chain) {
      case RpcQueryChain.ETH:
        return 'https://eth.rpc.blxrbdn.com';
      case RpcQueryChain.RINKEBY:
        return '';
      case RpcQueryChain.GOERLI:
        return '';
      case RpcQueryChain.POLYGON:
        return 'https://1rpc.io/matic';
      case RpcQueryChain.MUMBAI:
        return '';
      case RpcQueryChain.BSC:
        return 'https://bsc.meowrpc.com';
      case RpcQueryChain.BSC_TESTNET:
        return '';
      case RpcQueryChain.AVALANCHE:
        return 'AVALANCHE';
      case RpcQueryChain.AVALANCHE_TESTNET:
        return '';
      case RpcQueryChain.ARBITRUM:
        return 'https://arbitrum.llamarpc.com';
      case RpcQueryChain.ARBITRUM_TESTNET:
        return '';
      case RpcQueryChain.MANTLE:
        return 'https://rpc.mantle.xyzsss';
      // return 'https://rpc.mantle.xyz';
      case RpcQueryChain.MANTLE_TESTNET:
        return '';
      case RpcQueryChain.BASE:
        return 'https://mainnet.base.org';
      case RpcQueryChain.HOLESKY:
        return 'https://1rpc.io/holesky';
      case RpcQueryChain.SONEIUM:
        return 'https://rpc.minato.soneium.org'; //TODO: wait for mainnet RPC
      case RpcQueryChain.SONEIUM_MINATO:
        return 'https://rpc.minato.soneium.org';
      default:
        return '';
    }
  }

  static moralisChainToHex(queryChains: string[]) {
    const hexChainIds: string[] = [];

    queryChains.forEach((chain) => {
      switch (chain) {
        case MoralisQueryChain.ETH:
          hexChainIds.push(EvmChain.ETHEREUM.hex);
          break;
        case MoralisQueryChain.POLYGON:
          hexChainIds.push(EvmChain.POLYGON.hex);
          break;
        case MoralisQueryChain.BSC:
          hexChainIds.push(EvmChain.BSC.hex);
          break;
        case MoralisQueryChain.ARBITRUM:
          hexChainIds.push(EvmChain.ARBITRUM.hex);
          break;
        case MoralisQueryChain.AVALANCHE:
          hexChainIds.push(EvmChain.AVALANCHE.hex);
          break;
        case MoralisQueryChain.BASE:
          hexChainIds.push(EvmChain.BASE.hex);
          break;
        case MoralisQueryChain.HOLESKY:
          hexChainIds.push(EvmChain.HOLESKY.hex);
          break;
      }
    });
    return hexChainIds;
  }
}
