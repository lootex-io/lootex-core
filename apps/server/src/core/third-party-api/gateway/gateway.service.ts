import { Injectable, Logger } from '@nestjs/common';
import { RpcService } from '../rpc/rpc.service';
import { DEFAULT_LIMIT, Priority, QueryFlag } from './constants';
import { getChain as getRpcChain } from '../rpc/constants';
import {
  BaseNftApi,
  ContractMetadata,
  NftsResp,
  OnNFTThirdPageFetched,
  OwnersResp,
} from './gateway.interface';
import { Chain, ChainIdMap, ChainMap } from '@/common/libs/libs.service';
import { ChainId } from '@/common/utils/types';
import { ethers } from 'ethers';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { AlchemyNftApiService } from '@/core/third-party-api/alchemy/alchemy-nft-api.service';
import { MoralisNftApiService } from '@/core/third-party-api/moralis/moralis-nft-api.service';
import { NftscanNftApiService } from '@/core/third-party-api/nftscan/nftscan-nft-api.service';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private readonly nftscanNftApiService: NftscanNftApiService,
    private readonly alchemyNftApiService: AlchemyNftApiService,
    private readonly moralisNftApiService: MoralisNftApiService,
    // private readonly covalentService: CovalentService,
    private readonly rpcService: RpcService,
  ) {}

  /**
   * return all nft metadata of ownerAddress
   * @param chain see enum Chain
   * @param ownerAddress user address
   * @param limit default to 30
   * @param cursor used to getting the next page
   * @param priority Priority.HIGH will use Moralis to fetch data, Priority.NORMAL will use others.
   * @returns see interface NftsResp
   */
  async getNftsByOwner(
    chainId: ChainId,
    ownerAddress: string,
    nftLimit: number,
    onPage: OnNFTThirdPageFetched,
  ) {
    this.logger.debug('getNftsByOwner');

    const chain = ChainIdMap[chainId];
    if (!chain) {
      throw new Error(`chain: ${chain} not support`);
    }

    const res = await this.getNftApiService(chain).getNftsByOwner({
      chainId: +chainId,
      ownerAddress: ownerAddress,
      nftLimit: nftLimit,
      onPage: onPage,
    });
    return res;
  }

  /**
   * return all nft metadata of contractAddress
   * @param chainId see enum ChainId
   * @param contractAddress nft contract address
   * @param limit default to 30
   * @param cursor used to getting the next page
   * @param priority Priority.HIGH will use Moralis to fetch data, Priority.NORMAL will use others.
   * @returns see interface NftsResp
   */
  async getNftsByContract(
    chainId: ChainId,
    contractAddress: string,
    nftLimit: number,
    onPage: OnNFTThirdPageFetched,
  ): Promise<NftsResp> {
    this.logger.debug(`getNftsByContract ${chainId} ${contractAddress}`);
    const chain = ChainIdMap[chainId];
    if (!chain) {
      throw new Error(`chain: ${chain} not support`);
    }
    const res: NftsResp = await this.getNftApiService(chain).getNftsByContract({
      chainId: +chainId,
      contractAddress: contractAddress,
      nftLimit: nftLimit,
      onPage: onPage,
    });
    return res;
  }

  /**
   *
   * @param chain see enum Chain
   * @param contractAddress nft contract address
   * @param tokenIds nft id
   * @param priority Priority.HIGH will use Moralis to fetch data, Priority.NORMAL will use others.
   * @returns see interface NftsResp
   */
  async getNftOwnersByTokenId(
    chainId: ChainId,
    contractAddress: string,
    tokenId: string | number,
    priority = Priority.NORMAL,
    limit = DEFAULT_LIMIT,
    cursor = '',
  ): Promise<OwnersResp> {
    this.logger.debug('getNftsByTokenId');

    const chain = ChainIdMap[chainId];
    if (!chain) {
      throw new Error(`chain: ${chain} not support`);
    }

    if (chain === Chain.MANTLE || chain === Chain.MANTLE_TESTNET) {
      const res = await this.rpcService.getTokenOwner(ChainMap[chain].RPC, {
        ownerAddress: '',
        dest: [{ contractAddress: contractAddress, tokenIds: [`${tokenId}`] }],
      });
      const owners = res.map((e) => ({
        ownerAddress: e.ownerAddress.toLowerCase(),
        amount: e.amount,
      }));
      return {
        total: owners.length,
        cursor: '',
        result: owners,
      };
    } else {
      const res = await this.getNftApiService(chain).getOwnersByNft({
        chainId: +chainId,
        contractAddress: contractAddress,
        tokenId: tokenId.toString(),
      });
      return res;
    }
  }

  async getOwnersByTokenOnChain(
    chainId: string,
    contractAddress: string,
    tokenId: string,
    ownerAddress?: string,
  ): Promise<{ ownerAddress: string; amount: string }[]> {
    const chain = ChainIdMap[chainId];
    if (!chain) {
      throw new Error(`chain: ${chain} not support`);
    }
    const res = await this.rpcService.getTokenOwner(ChainMap[chain].RPC, {
      ownerAddress: ownerAddress,
      dest: [{ contractAddress: contractAddress, tokenIds: [`${tokenId}`] }],
    });
    const owners = res.map((e) => ({
      ownerAddress: e.ownerAddress?.toLowerCase(),
      amount: e.amount,
    }));
    return owners;
  }

  async syncContract(
    chainId: string,
    contractAddress: string,
    priority = Priority.NORMAL,
  ) {}

  async syncMetadataByTokenIdsByContract(
    chainId: string,
    contractAddress: string,
    tokenIds: string[],
    flag = QueryFlag.URI,
    priority = Priority.NORMAL,
  ) {}

  async getNftsByTokenIdsByContractOnChain(
    chainId: ChainId,
    contractAddress: string,
    tokenIds: string[],
  ) {
    this.logger.debug('getNftsByTokenIdsByContract');
    const chain = ChainIdMap[chainId];
    if (!chainId) {
      throw new Error(`chain: ${chain} not support`);
    }
    const res = await this.rpcService.getNftsByTokenIdsByContract(
      getRpcChain(chain),
      contractAddress,
      tokenIds,
    );

    return res;
  }

  async getNftByTokenIdByContractOnChain(
    chainId: ChainId,
    contractAddress: string,
    tokenId: string,
    rpcEnd = RpcEnd.default,
  ) {
    this.logger.debug('getNftByTokenIdByContract');
    const chain = ChainIdMap[chainId];
    if (!chainId) {
      throw new Error(`chain: ${chain} not support`);
    }
    const nft = await this.getRpcService(rpcEnd).getNftByTokenIdByContract(
      getRpcChain(chain),
      contractAddress,
      tokenId,
    );
    return nft;
  }

  // async getNftsByOwnerByContractByTokenIdsOnChain(
  //   chainId: ChainId,
  //   reqs: TokenAmountQuery[],
  // ) {
  //   this.logger.debug('getNftsByOwnerByContractByTokenIdsOnChain');
  //   const chain = ChainIdMap[chainId];
  //   if (!chainId) {
  //     throw new Error(`chain: ${chain} not support`);
  //   }
  //   const res = await this.rpcService.getTokenAmount(getRpcChain(chain), reqs);
  //
  //   return this.getReturnData(res);
  // }

  // async getNftsByOwnerByContractOnChain(
  //   chainId: ChainId,
  //   contractAddress: string,
  //   ownerAddress: string,
  // ) {
  //   this.logger.debug('getNftsByOwnerByContractOnChain');
  //
  //   const chain = ChainIdMap[chainId];
  //   if (!chain) {
  //     throw new Error(`chain: ${chain} not support`);
  //   }
  //
  //   const res = await this.rpcService.getNftsByOwnerByContract(
  //     getRpcChain(chain),
  //     contractAddress,
  //     ownerAddress,
  //   );
  //
  //   return this.getReturnData(res);
  // }

  async getContractInfoOnChain(chainId: ChainId, contractAddress: string) {
    this.logger.debug('getContractInfoOnChain');

    const chain = ChainIdMap[chainId];
    if (!chain) {
      throw new Error(`chain: ${chain} not support`);
    }

    return await this.rpcService.getContractInfo(getRpcChain(chain), [
      contractAddress,
    ]);
  }

  async getContractOwnerOnChain(
    chainId: ChainId,
    contractAddresses: string[],
    rpcEnd = RpcEnd.default,
  ) {
    this.logger.debug('getContractOwnerOnChain');

    const chain = ChainIdMap[chainId];
    if (!chainId) {
      throw new Error(`chain: ${chain} not support`);
    }

    return await this.getRpcService(rpcEnd).getContractOwner(
      getRpcChain(chain),
      contractAddresses,
    );
  }

  async getAssetTotalOwners(
    chainId: ChainId,
    contractAddress: string,
    tokenId: string,
    option?: {
      priority?: Priority;
      rpcEnd?: RpcEnd;
    },
  ) {
    this.logger.debug('getAssetTotalOwners');

    const chain = ChainIdMap[chainId];
    if (!chainId) {
      throw new Error(`chain: ${chain} not support`);
    }

    if (
      chain === Chain.MANTLE ||
      chain === Chain.MANTLE_TESTNET ||
      chain === Chain.SONEIUM
    ) {
      return '1';
    } else {
      return await this.moralisNftApiService.getNftTotalOwnersNumber({
        chainId: +chainId,
        contractAddress: contractAddress,
        tokenId: tokenId,
      });
    }
  }

  @Cacheable({
    key: 'moralis-getCollectionStats',
  })
  async getCollectionStats(
    chainId: ChainId,
    contractAddress: string,
    priority = Priority.NORMAL,
  ) {
    this.logger.debug('getAssetTotalOwners');

    const chain = ChainIdMap[chainId];
    if (!chainId) {
      throw new Error(`chain: ${chain} not support`);
    }
    if (
      chain === Chain.MANTLE ||
      chain === Chain.MANTLE_TESTNET ||
      chain === Chain.SONEIUM
    ) {
      return {
        total_tokens: '0',
        owners: {
          current: '0',
        },
        transfers: {
          total: '0',
        },
      };
    } else {
      return await this.moralisNftApiService.getCollectionStats({
        chainId: +chainId,
        contractAddress: contractAddress,
      });
    }
  }

  async getNftStatus(
    chainId: ChainId,
    contractAddress: string,
    tokenId: string,
  ) {
    this.logger.debug('getAssetTotalOwners');
    const chain = ChainIdMap[chainId];
    if (!chainId) {
      throw new Error(`chain: ${chain} not support`);
    }
    if (
      chain === Chain.MANTLE ||
      chain === Chain.MANTLE_TESTNET ||
      chain === Chain.SONEIUM
    ) {
      return '1';
    } else {
      return await this.moralisNftApiService.getNftStatus({
        chainId: +chainId,
        contractAddress: contractAddress,
        tokenId: tokenId,
      });
    }
  }

  async get1155BalanceOf(
    chainId: ChainId,
    contractAddress: string,
    ownerAddress: string,
    tokenId: string,
    rpcEnd = RpcEnd.default,
  ) {
    this.logger.debug(
      `getBalanceOf ${chainId} ${contractAddress} ${ownerAddress}`,
    );

    // chainId to ProviderChain
    const chain = ChainMap[ChainIdMap[chainId]].RPC;
    if (!chainId) {
      throw new Error(`chain: ${chain} not support`);
    }

    return await this.getRpcService(rpcEnd).getErc1155BalanceOf(
      chain,
      contractAddress,
      ownerAddress,
      tokenId,
    );
  }

  getContractTotalSupply(chainId: ChainId, contractAddress: string) {
    this.logger.debug('getContractTotalSupply');

    // TODO: waiting for Moralis support SONEIUM
    if (chainId === '1868' || chainId === '1946') {
      return 0;
    }

    const chain = ChainIdMap[chainId];
    if (!chainId) {
      throw new Error(`chain: ${chain} not support`);
    }

    return this.moralisNftApiService.getSupplyByContract({
      chainId: +chainId,
      contractAddress: contractAddress,
    });
  }

  getOnchainTotalSupply(chainId: ChainId, contractAddress: string) {
    this.logger.debug('getOnchainTotalSupply');

    // chainId to ProviderChain
    const chain = ChainMap[ChainIdMap[chainId]].RPC;
    if (!chainId) {
      throw new Error(`chain: ${chain} not support`);
    }

    return this.rpcService.getTotalSupply(chain, contractAddress);
  }

  getContractMetadata(
    chainId: ChainId,
    contractAddress: string,
  ): Promise<ContractMetadata | undefined> {
    const chain = ChainIdMap[chainId];
    if (!chainId) {
      throw new Error(`chain: ${chain} not support`);
    }
    if (
      chain === Chain.MANTLE ||
      chain === Chain.MANTLE_TESTNET ||
      chain === Chain.SONEIUM
    ) {
      return undefined;
    } else {
      return this.moralisNftApiService.getContractMetadata({
        chainId: +chainId,
        contractAddress: contractAddress,
      });
    }
  }

  async nativeGetDecimals(chainId: ChainId, contractAddress: string) {
    return this.rpcService.nativeGetDecimals(+chainId, contractAddress);
  }

  async nativeGetOwnerOf(
    chainId: ChainId,
    contractAddress: string,
    tokenId: string,
  ) {
    return this.rpcService.nativeGetOwnerOf(+chainId, contractAddress, tokenId);
  }

  async nativeGetBalanceOf(
    chainId: ChainId,
    contractAddress: string,
    ownerAddress: string,
    id: string = null,
  ): Promise<ethers.BigNumber> {
    return this.rpcService.nativeGetBalanceOf(
      +chainId,
      contractAddress,
      ownerAddress,
      id,
    );
  }

  async nativeGetERC20BalanceOf(
    chainId: ChainId,
    contractAddress: string,
    ownerAddress: string,
  ) {
    return this.rpcService.nativeGetERC20BalanceOf(
      +chainId,
      contractAddress,
      ownerAddress,
    );
  }

  async nativeGetERC20Allowance(
    chainId: ChainId,
    contractAddress: string,
    ownerAddress: string,
    spenderAddress: string,
  ) {
    return this.rpcService.nativeGetERC20Allowance(
      +chainId,
      contractAddress,
      ownerAddress,
      spenderAddress,
    );
  }

  async nativeGetERC721IsApprovedForAll(
    chainId: ChainId,
    contractAddress: string,
    ownerAddress: string,
    operatorAddress: string,
  ) {
    return this.rpcService.nativeGetERC721IsApprovedForAll(
      +chainId,
      contractAddress,
      ownerAddress,
      operatorAddress,
    );
  }

  async nativeGetERC1155IsApprovedForAll(
    chainId: ChainId,
    contractAddress: string,
    ownerAddress: string,
    operatorAddress: string,
  ) {
    return this.rpcService.nativeGetERC1155IsApprovedForAll(
      +chainId,
      contractAddress,
      ownerAddress,
      operatorAddress,
    );
  }

  async nativeGetERC1271IsValidSignature(
    chainId: ChainId,
    contractAddress: string,
    challenge: string,
    signature: string,
  ) {
    return this.rpcService.nativeGetERC1271IsValidSignature(
      +chainId,
      contractAddress,
      challenge,
      signature,
    );
  }

  getNftApiService(chain: Chain): BaseNftApi {
    if (chain === Chain.MANTLE || chain === Chain.MANTLE_TESTNET) {
      return this.nftscanNftApiService;
    } else if (chain === Chain.SONEIUM) {
      return this.alchemyNftApiService;
    } else if (chain === Chain.BASE) {
      return this.alchemyNftApiService;
    } else {
      return this.moralisNftApiService;
    }
  }

  getRpcService(rpcEnd = RpcEnd.default): RpcService {
    // if (rpcEnd === RpcEnd.ankr) {
    //   return this.rpcAnkrService;
    // } else {
    return this.rpcService;
    // }
  }

  @Cacheable({ seconds: 120 })
  async getTransactionReceipt(
    chainId: number,
    txHash: string,
    rpcEnd = RpcEnd.default,
  ) {
    return await this.getRpcService(rpcEnd).getTransactionReceipt(
      chainId,
      txHash,
    );
  }

  async waitForTransaction(
    chainId: number,
    txHash: string,
    rpcEnd = RpcEnd.default,
    confirms = 0,
  ) {
    return await this.getRpcService(rpcEnd).waitForTransaction(
      chainId,
      txHash,
      confirms,
    );
  }

  async waitForTransactionV6(
    chainId: number,
    txHash: string,
    rpcEnd = RpcEnd.default,
    confirms = 0,
  ) {
    return await this.getRpcService(rpcEnd).waitForTransactionV6(
      chainId,
      txHash,
      confirms,
    );
  }

  getConfirmsToWaitBlock(chainId: number, seconds: number) {
    switch (chainId) {
      case 1:
        return Math.ceil(seconds / 12);
      case 56:
        return Math.ceil(seconds / 3);
      case 137:
        return Math.ceil(seconds / 2);
      case 43114:
        return Math.ceil(seconds / 3);
      case 42161:
        return Math.ceil(seconds / 3);
      case 5000:
        return Math.ceil(seconds / 0.6);
      case 8453:
        return Math.ceil(seconds / 2);
      default:
        return 2;
    }
  }

  @Cacheable({ seconds: 10 })
  async getTransaction(
    chainId: number,
    txHash: string,
    rpcEnd = RpcEnd.default,
  ) {
    return await this.getRpcService(rpcEnd).getTransaction(chainId, txHash);
  }

  async getBlock(
    chainId: number,
    blockHashOrNumberOrBlockTag: string | number,
    rpcEnd = RpcEnd.default,
  ) {
    return await this.getRpcService(rpcEnd).getBlock(
      chainId,
      blockHashOrNumberOrBlockTag,
    );
  }

  async getStudioContractGetClaimConditionById(
    chainId: ChainId,
    contractAddress: string,
    _conditionId: string,
    _tokenId?: string,
    rpcEnd = RpcEnd.default,
  ) {
    if (_tokenId) {
      return await this.getRpcService(
        rpcEnd,
      ).getStudioContractGetClaimConditionByIdAndTokenId(
        chainId,
        contractAddress,
        _conditionId,
        _tokenId,
      );
    }

    return await this.getRpcService(
      rpcEnd,
    ).getStudioContractGetClaimConditionById(
      chainId,
      contractAddress,
      _conditionId,
    );
  }
}
