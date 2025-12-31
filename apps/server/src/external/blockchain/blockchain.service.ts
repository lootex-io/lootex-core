/**
 * Blockchain Service
 * - Gives providers or libraries to access the blockchain
 * - Does not care which chain family, so you use contract yourself
 */
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
  ) {}

  /**
   * @function getEthProviderByChainId
   * @summary gives you a JsonRpcProvider with corresponding chain ID configs
   * @param {Number} chainId Ethereum compatible network chain ID
   * @return {ethers.providers.StaticJsonRpcProvider} provider
   */
  getEthProviderByChainId(chainId: number): ethers.providers.JsonRpcProvider {
    const rpcUrl = '';

    return new ethers.providers.JsonRpcProvider(rpcUrl, +chainId);
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
