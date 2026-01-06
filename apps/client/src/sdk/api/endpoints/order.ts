import type { Asset } from "../../asset/types";
import type { ExternalLink } from "../../collection/types";
import type { LootexOrder, PlatformType } from "../../order/types";
import type { createRequest } from "../request";
import type { PaginatedParams, PaginatedResponse } from "./utils";

export type CreateOrderParams = LootexOrder["seaportOrder"]["parameters"] & {
  signature: `0x${string}`;
  hash: `0x${string}`;
  exchangeAddress: `0x${string}`;
  category: string;
  chainId: string;
  counter: string;
};
export type CreateOrderResponse = LootexOrder;

export type CreateBulkOrderParams = CreateOrderParams[];
export type CreateBulkOrderResponse = LootexOrder[];

export type GetOrdersParams = PaginatedParams<{
  chainId?: number;
  hash?: `0x${string}`;
  tokenId?: number | string;
  username?: string;
  userAddress?: `0x${string}`;
  offererUserName?: string;
  offerer?: `0x${string}`;
  contractAddress?: `0x${string}`;
  sortBy?: [
    "price" | "per_price" | "platformType" | "endTime" | "createdAt",
    "ASC" | "DESC",
  ][];
  isFillable?: boolean;
  isCancelled?: boolean;
  isExpired?: boolean;
  category?: "LISTING" | "OFFER";
  offerType?: "Normal" | "Collection";
  hashes?: `0x${string}`[];
  offererUsername?: string;
  endTimeGt?: number;
}>;
export type GetOrdersResponse = PaginatedResponse<LootexOrder, "orders">;

export type PostOpenseaSignatureParams = {
  orderHash: `0x${string}`;
  chainId: number;
  exChangeAddress: string;
  fulfillerAddress: string;
}[];
export type PostOpenseaSignatureResponse = {
  orderHash: string;
  chainId: number;
  exChangeAddress: string;
  fulfillerAddress: string;
  signature: string;
}[];

export type GetPlatformFeeInfoResponse = {
  platformFee: string;
  platformFeeAddress: `0x${string}`;
};

export type OrderHistoryCategory =
  | "list"
  | "offer"
  | "collection_offer"
  | "sale"
  | "cancel";
export type OrderHistoryStatus = "Init" | "Expired" | "Canceled" | "Fulfilled";
export type OrderHistory = {
  contractAddress: `0x${string}`;
  fromAddress?: `0x${string}`;
  toAddress?: `0x${string}`;
  hash: `0x${string}`;
  id: string;
  tokenId: string;
  amount: string;
  chainId: number;
  category: OrderHistoryCategory;
  startTime: Date;
  endTime: Date;
  price: number;
  perPrice: string;
  currencySymbol: string;
  usdPrice: number;
  txHash?: `0x${string}` | null;
  createdAt: Date;
  updatedAt: Date;
  orderStatus: OrderHistoryStatus;
  platformType: PlatformType;
  assetName: string;
  assetImageUrl: string;
  assetImagePreviewUrl: string;
  collectionId: string;
  collectionChainShortName: string;
  collectionSlug: string;
  collectionName: string;
  collectionContractAddress: `0x${string}`;
  collectionServiceFee: string;
  collectionCreatorFee: string;
  collectionOwnerAddress: `0x${string}`;
  collectionLogoImageUrl: string;
  collectionExternalLinks: ExternalLink[];
  collectionIsVerified: boolean;
};
export type GetOrdersHistoryParams = PaginatedParams<{
  chainId?: number;
  tokenId?: string;
  contractAddress?: `0x${string}`;
  userAddress?: `0x${string}`;
  category?: Array<OrderHistoryCategory>;
}>;
export type GetOrdersHistoryResponse = PaginatedResponse<
  OrderHistory,
  "ordersHistory"
>;

export type VerifyListingOrdersParams = {
  chainId: string;
  exchangeAddress: string;
  hash: string;
}[];
export type VerifyListingOrdersResponse = {
  certification: {
    chainId?: string;
    debug: string;
    exchangeAddress: string;
    isAssetBlocked: boolean;
    isAssetFind: boolean;
    isCollectionBlocked: boolean;
    isCollectionFind: boolean;
    isOffererBlocked: boolean;
    isOffererFind: boolean;
    isOrderFind: boolean;
    offererUsername: string;
    offererWalletAddress: string;
    orderHash: string;
  };
  orderStatus: {
    id: string;
    isCancelled: boolean;
    isExpired: boolean;
    isFillable: boolean;
    isValidated: boolean;
  };
}[];

export type ReceivedOffer = Omit<Asset, "id">;
export type GetReceivedOffersParams = PaginatedParams<{
  chainId: string;
  username: string;
  userAddress: `0x${string}`[];
}>;
export type GetReceivedOffersResponse = PaginatedResponse<
  ReceivedOffer,
  "items"
>;

export type SyncAggregatorOrdersParams = {
  chainId?: number;
  contractAddress: string;
  tokenId: string;
};
export type SyncAggregatorOrdersResponse = {
  synced: boolean;
  msg: string;
};

export const createOrderEndpoints = (
  request: ReturnType<typeof createRequest>
) => ({
  getOrders: async (params: GetOrdersParams) => {
    return request<GetOrdersResponse>({
      method: "GET",
      path: "/v3/orders",
      query: params,
    });
  },
  getOpenseaSignature: async (params: PostOpenseaSignatureParams) => {
    return request<PostOpenseaSignatureResponse>({
      method: "POST",
      path: "/v3/aggregator/os/signatures",
      body: params,
    });
  },
  createOrder: async (params: CreateOrderParams) => {
    return request<CreateOrderResponse>({
      method: "POST",
      path: "/v3/orders",
      body: params,
    });
  },
  createBulkOrders: async (params: CreateBulkOrderParams) => {
    return request<CreateBulkOrderResponse>({
      method: "POST",
      path: "/v3/orders/bulk",
      body: params,
    });
  },
  getPlatformFeeInfo: () => {
    return request<GetPlatformFeeInfoResponse>({
      method: "GET",
      path: "/v3/orders/platform-fee",
    });
  },
  getOrdersHistory: (params: GetOrdersHistoryParams) => {
    return request<GetOrdersHistoryResponse>({
      method: "GET",
      path: "/v3/orders/history",
      query: params,
    });
  },
  verifyListingOrders: async (params: VerifyListingOrdersParams) => {
    return request<VerifyListingOrdersResponse>({
      method: "POST",
      path: "/v3/orders/certification",
      body: params,
    });
  },
  getReceivedOffers: (params: GetReceivedOffersParams) => {
    return request<GetReceivedOffersResponse>({
      method: "GET",
      path: "/v3/orders/account/received-offer",
      query: params,
    });
  },
  syncAggregatorOrders: async (params: SyncAggregatorOrdersParams) => {
    return request<SyncAggregatorOrdersResponse>({
      method: "POST",
      path: "/v3/aggregator/syncOrder",
      body: params,
    });
  },
});
