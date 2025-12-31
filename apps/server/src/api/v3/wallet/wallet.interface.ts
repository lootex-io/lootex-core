import { Pagination } from '@/common/utils/utils.interface';

export interface GetWalletsByUsernameParam {
  username: string;
}

export interface WalletResponse {
  chainFamily: string;
  isMainWallet: boolean;
  address: string;
  status: string;
}

export interface WalletsResponse {
  wallets: WalletResponse[];
  pagination: Pagination;
}
