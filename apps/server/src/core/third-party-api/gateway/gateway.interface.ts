import { ContractType } from './constants';
import { Logger } from '@nestjs/common';

export interface NftsResp {
  total: number;
  cursor: string;
  result: Nft[];
}

export interface OwnersResp {
  total: number;
  cursor: string;
  result: Owner[];
}

export interface Nft {
  tokenId: string; // "8117",
  contract: Contract;
  owner: Owner;
  tokenUri: string; // "https://storage.qubic.market/137/0xb03f5d50c126c8a65707f6fc9cae12589bbeb4c6/8117",
  metadata: any;
  totalAmount?: string;
  isSpam: boolean;
}

export interface Contract {
  contractAddress: string; // "0x5c6e2892ed14bd178f0928abce94c1373b8265eb",
  name: string; // "BruceTheGoose1155",
  symbol: string; // "BTGE",
  contractType: ContractType; // "ERC1155",
}

export interface Owner {
  ownerAddress: string; // "0xa87bf2268e149ae86f064d16596a0af09f5b50ff",
  amount?: string; // "1",
}

export interface TokenAmountQuery {
  contractAddress: string;
  ownerAddress: string;
  tokenId: string;
}

export interface ContractMetadata {
  contractAddress: string; // "0x5c6e2892ed14bd178f0928abce94c1373b8265eb",
  name: string; // "BruceTheGoose1155",
  symbol: string; // "BTGE",
  contractType: ContractType; // "ERC1155",
  syncedAt: string;
  possibleSpam: boolean;
  verifiedCollection: boolean;
}

export type OnNFTThirdPageFetched = (
  page: number | string,
  nfts: Nft[],
) => void;

export const NFT_API_NFT_LIMIT = 20000;

/**
 * BASE THIRD PARTY NFT API
 */
export abstract class BaseNftApi {
  protected logger: Logger;

  protected constructor(params?: { logger?: Logger }) {
    this.logger = params?.logger ?? new Logger(BaseNftApi.name);
  }
  abstract getNftsByContract(params: {
    chainId: number;
    contractAddress: string;
    limit?: number;
    cursor?: string;
    nftLimit?: number; // 默认获取nft最大值
    onPage?: OnNFTThirdPageFetched;
  }): Promise<NftsResp>;

  abstract getNftsByOwner(params: {
    chainId: number;
    ownerAddress: string;
    limit?: number;
    cursor?: string;
    nftLimit?: number; // 默认获取nft最大值
    onPage?: OnNFTThirdPageFetched;
  }): Promise<NftsResp>;

  abstract getOwnersByNft(params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
    limit?: number;
    cursor?: string;
  }): Promise<OwnersResp>;

  parseContractType(type) {
    if (type) {
      type = type.toString().toUpperCase();
      if (type.indexOf(ContractType.ERC721.toString()) > -1) {
        return ContractType.ERC721;
      } else if (type.indexOf(ContractType.ERC1155.toString()) > -1) {
        return ContractType.ERC1155;
      }
    }
    return ContractType.UNKNOWN;
  }
}
