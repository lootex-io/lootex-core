import { SupportedMethod } from './constants';

export interface ProxyContractRequest {
  contractAddress: string;
  callData: callData[];
  context: any;
}

export interface callData {
  method: SupportedMethod;
  param: any[];
}

export interface RpcContractInfo {
  name: string;
  symbol: string;
  totalSupply: number;
  contractType: string;
  contractAddress: string;
}

export interface RpcTokenInfo {
  tokenId: string;
  tokenUri: string;
  ownerAddress: string;
  amount: string;
  contract: RpcContractInfo;
}

export interface TokenOwner {
  ownerAddress: string;
  dest: {
    contractAddress: string;
    tokenIds: string[];
  }[];
}

export interface ContractOwner {
  ownerAddress: string;
  contractAddress: string;
}

export interface TokenUri {
  contractAddress: string;
  ownerAddress: string;
}

export enum RpcEnd {
  default = 'default', // default
  // ankr = 'ankr',
  public = 'public',
  event = 'event', // event poller
}
