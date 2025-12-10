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

export enum WalletHistoryEvent {
  PENDING = 'Pending',
  FAILED = 'Failed',
  UNKNOWN = 'Unknown',
  NATIVE_TOKEN_TRANSFER = 'NativeTokenTransfer',
  ERC20_TOKEN_TRANSFER = 'ERC20TokenTransfer',
  ERC721_TOKEN_TRANSFER = 'ERC721TokenTransfer',
  ERC1155_TOKEN_TRANSFER_SINGLE = 'ERC1155TokenTransferSingle',
  ERC1155_TOKEN_TRANSFER_BATCH = 'ERC1155TokenTransferBatch',
  ERC404_TOKEN_TRANSFER = 'ERC404TokenTransfer',
  NFT_BATCH_TRANSFER = 'NFTBatchTransfer',
  APPROVAL_FOR_ALL = 'ApprovalForAll',
  APPROVAL = 'Approval',
  TRANSFER = 'Transfer',
  SEAPORT_ORDERFULFILLED = 'SeaportOrderFulfilled',
  SEAPORT_CANCEL = 'SeaportCancelOrder',
  GP_TOP_UP = 'GPTopUp',
  SWAP = 'Swap',
}

export enum WalletHistoryTag {
  MINT = 'Mint',
  BATCH = 'Batch',
  SMART_MINT = 'SmartMint',
  PURCHASE = 'Purchase',
  SWEEP = 'Sweep',
  CART = 'Cart',
  ACCEPT_OFFER = 'AcceptOffer',
  WRAPPED = 'Wrapped',
  POOL = 'Pool',
}

export interface RecodeWalletHistory {
  walletAddress: string;
  chainId: number;
  contractAddress: string;
  event: string;
  isMainEvent: boolean;
  symbol?: string;
  outAmount?: string;
  outAmountUsd?: string;
  inAmount?: string;
  inAmountUsd?: string;
  toAddress?: string;
  nftAddress?: string;
  currencyAddress?: string;
  tokenId?: string;
  bool?: boolean;
  blockTime: string;
  block: number;
  tag?: string;
  orderHash?: string;
  txHash: string;
  logIndex?: number;
  fee?: string;
  isSa?: boolean;
  isPaymaster?: boolean;
  nativeUsdPrice?: string;
  ip?: string;
  area?: string;
}
