import type {
  BigNumberish,
  ConsiderationInputItem,
  CreateInputItem,
  OfferItem,
  OrderComponents,
} from '../seaport/types';

import type { Account, Chain, Transport, WalletClient } from 'viem';
import type { ApiClient } from '../api/api-client';
import type { LootexOrder } from '../order/types';
import type { Token } from '../token/types';
import type { CurrencyAmount } from '../utils/currency-amount';
import type { TransactionData } from '../utils/transaction';

export type ActionType = 'approve' | 'exchange' | 'cancel' | 'create' | 'sync';

export type TipConfig = {
  recipient: `0x${string}`;
  percentage: number;
};

export type ApprovalAction = {
  type: 'approve';
  operator: `0x${string}`;
  buildTransaction: () => Promise<TransactionData>;
} & Pick<OfferItem, 'itemType' | 'token' | 'identifierOrCriteria'>;

export type ExchangeAction = {
  type: 'exchange';
  orders: LootexOrder[];
  buildTransaction: () => Promise<TransactionData>;
};

export type CreateOrderAction = {
  type: 'create';
  // getMessageToSign: () => Promise<string>;
  createOrders: (options?: {
    enableBulkOrder?: boolean;
    createOrdersOnOrderbook?: boolean;
    encodeSignature?: (signature: `0x${string}`) => `0x${string}`;
  }) => Promise<{
    seaportOrders: {
      parameters: OrderComponents;
      signature: `0x${string}`;
      orderHash: `0x${string}`;
    }[];
    lootexOrders: LootexOrder[];
  }>;
};

export type FulfillOrdersExecution = {
  actions: (ApprovalAction | ExchangeAction)[];
  syncTxHashes: (hashes: `0x${string}`[]) => Promise<boolean[]>;
};

export type CreateOrdersExecution = {
  actions: (ApprovalAction | CreateOrderAction)[];
};

export type FeeConfig = {
  percentage: number;
  recipient: `0x${string}`;
};

export type FormatOrderParams = {
  tokenAddress: `0x${string}`;
  tokenId: string;
  tokenType: 'ERC721' | 'ERC1155';
  unitPrice: CurrencyAmount<Token>;
  quantity: string | number | bigint;
  duration: Date;
  orderType: CreateOrderType;
  fees: FeeConfig[];
  accountAddress: `0x${string}`;
};

export type CreateOrderType = 'LISTING' | 'OFFER' | 'COLLECTION_OFFER';

export type QueryOrdersParams = Parameters<ApiClient['orders']['getOrders']>[0];
export type QueryOrdersResponse = Awaited<
  ReturnType<ApiClient['orders']['getOrders']>
>;

export type CreateOrdersParams = {
  chainId: number;
  orders: Omit<FormatOrderParams, 'accountAddress'>[];
  accountAddress: `0x${string}`;
  walletClient: WalletClient<Transport, Chain, Account>;
  checkBalanceAndApproval?: boolean;
};

export type FulfillOrdersParams = {
  chainId: number;
  orders: LootexOrder[];
  accountAddress: `0x${string}`;
  operator?: `0x${string}`;
  maxOrdersPerTx?: number;
  tips?: TipConfig[];
  isFullfillOffer?: boolean;
};

export type CancelOrdersParams = {
  chainId: number;
  orders: LootexOrder[];
};

export type ValidateOrdersParams = {
  chainId: number;
  orders: LootexOrder[];
};

export type OfferItemOnCreate = {
  itemType: number;
  identifier: string;
  identifierOrCriteria?: string;
  token: `0x${string}`;
  amount?: string | bigint;
  startAmount?: string | bigint;
  endAmount?: string | bigint;
};

export type ConsiderationItemOnCreate = OfferItemOnCreate & {
  recipient: `0x${string}`;
};

export type CreateOrderInput = {
  conduitKey?: string;
  zone?: string;
  zoneHash?: string;
  startTime?: BigNumberish;
  endTime?: BigNumberish;
  offer: readonly CreateInputItem[];
  consideration: readonly ConsiderationInputItem[];
  counter?: BigNumberish;
  allowPartialFills?: boolean;
  restrictedByZone?: boolean;
  domain?: string;
  salt?: BigNumberish;
};
