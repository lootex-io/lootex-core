/**
 * Blockchain Service
 * - Gives providers or libraries to access the blockchain
 * - Does not care which chain family, so you use contract yourself
 */
import * as fcl from '@onflow/fcl';
import * as solanaWeb3 from '@solana/web3.js';
import { ethers } from 'ethers';
import { Injectable } from '@nestjs/common';
import { ConfigurationService } from '@/configuration';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';

@Injectable()
export class BlockchainService {
  // private fclInstance: fcl = null;
  private fclConfig: Record<string, string>;

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly rpcHandlerService: RpcHandlerService,
  ) {
    const fclConfig = {
      'flow.network': this.configurationService.get(
        'FLOW_MAINNET_CONFIG_FLOW_NETWORK',
      ),
      'accessNode.api': this.configurationService.get(
        'FLOW_MAINNET_CONFIG_ACCESSNODE_API',
      ),
      'discovery.wallet': this.configurationService.get(
        'FLOW_MAINNET_CONFIG_DISCOVERY_WALLET',
      ),
    };
    fcl.config(fclConfig);
    this.fclConfig = fclConfig;
    // this.fclInstance = fcl;
  }

  /**
   * @function getEthProviderByChainId
   * @summary gives you a JsonRpcProvider with corresponding chain ID configs
   * @param {Number} chainId Ethereum compatible network chain ID
   * @return {ethers.providers.StaticJsonRpcProvider} provider
   */
  getEthProviderByChainId(chainId: number): ethers.providers.JsonRpcProvider {
    const rpcUrl = '';
    // Campaign202212Service 老代码， 注释掉
    // switch (chainId) {
    //   case 1:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_ETHEREUM');
    //     break;
    //   case 3:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_ROPSTEN');
    //     break;
    //   case 4:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_RINKEBY');
    //     break;
    //   case 5:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_GOERLI');
    //     break;
    //   case 42:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_KOVAN');
    //     break;
    //   case 56:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_BSC');
    //     break;
    //   case 97:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_BSC_TESTNET');
    //     break;
    //   case 137:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_POLYGON');
    //     break;
    //   case 250:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_FANTOM');
    //     break;
    //   case 4002:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_FANTOM_TESTNET');
    //     break;
    //   case 80001:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_MUMBAI');
    //     break;
    //   case 43114:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_AVALANCHE');
    //     break;
    //   case 43113:
    //     rpcUrl = this.configurationService.get(
    //       'RPC_ENDPOINT_AVALANCHE_TESTNET',
    //     );
    //     break;
    //   case 42161:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_ARBITRUM');
    //     break;
    //   case 421611:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_ARBITRUM_TESTNET');
    //     break;
    //   case 5000:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_MANTLE');
    //     break;
    //   case 5001:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_MANTLE_TESTNET');
    //     break;
    //   case 8453:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_BASE');
    //     break;
    //   case 84532:
    //     rpcUrl = this.configurationService.get('RPC_ENDPOINT_BASE_TESTNET');
    //     break;
    //   default:
    //     throw new TypeError('getEthProviderByChainId: invalid chainId');
    // }

    // return new ethers.providers.StaticJsonRpcProvider(rpcUrl, +chainId);
    return new ethers.providers.JsonRpcProvider(rpcUrl, +chainId);
  }

  /**
   * @function getSolConnectionByCluster
   * @summary gives a solana connection to use, defaults to mainnet-beta
   * @param {solanaWeb3.Cluster} cluster Solana JSON RPC cluster designation
   * @return {solanaWeb3.Connection} connection
   */
  getSolConnectionByCluster(
    cluster: solanaWeb3.Cluster = 'mainnet-beta',
  ): solanaWeb3.Connection {
    if (!['devnet', 'mainnet-beta', 'testnet'].includes(cluster)) {
      throw new TypeError(
        'getSolConnectionByCluster: invalid cluster designation',
      );
    }
    return new solanaWeb3.Connection(solanaWeb3.clusterApiUrl(cluster));
  }

  /**
   * @function getFlowLibraryConfig
   * @summary returns the current FCL instance config for outside usage
   * @return fclConfig
   */
  getFlowLibraryConfig(): Record<string, string> {
    return this.fclConfig;
  }

  /**
   * @function getFlowLibrary
   * @summary returns the current FCL instance config for outside usage
   * @return fcl
   */
  // getFlowLibrary(): fcl {
  //   return this.fclInstance;
  // }

  getWalletByPrivateKey(chainId: number, privateKey: string) {
    const wallet = new ethers.Wallet(
      privateKey,
      this.getEthProviderByChainId(chainId),
    );

    return wallet;
  }
}
