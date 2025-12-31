import { Pagination } from '@/common/utils/utils.interface';
import { Wallet } from '@/model/entities';

export interface UploadFile {
  url?: string;
}

export interface GetAccountsQuery {
  page: number;
  limit: number;
  chainId?: string;
  contractAddress?: string;
  tokenId?: string;
}

export interface GetAccountQuery {
  walletAddress?: string;
  username?: string;
}

export interface ReturnAccountResponse {
  username: string;
  avatarUrl: string;
  introduction: string;
  status: string;
  wallets: Array<Wallet>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

export interface GetAccountResponse extends ReturnAccountResponse {
  id: string;
}

export interface GetAccountsResponse {
  // queueStatus?: string;
  accounts: {
    username: string;
    avatarUrl: string;
    address: string;
    quantity?: string;
    updatedAt: string;
  }[];
  count: number;
}

export interface AccountsResponse {
  accounts: GetAccountsResponse[];
  pagination: Pagination;
}

export interface ExploreUsersByOpt {
  keywords: string[];
  limit: number;
  page: number;
}

export const AccountAttributes = [
  'id',
  'username',
  'avatarUrl',
  'introduction',
  'status',
  'createdAt',
  'updatedAt',
  'block',
];

export const AccountMinAttributes = ['username', 'avatarUrl', 'block'];
