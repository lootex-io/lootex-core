import { AssetEventCategory } from '@/api/v3/asset/asset.interface';
import { SeaportOrder as SeaportOrderEntity } from '@/model/entities';
import { BigNumber } from 'ethers';

export enum Category {
  LISTING = 'listing',
  OFFER = 'offer',
  AUCTION = 'auction',
  BUNDLE = 'bundle',
  OTHER = 'other',
  COLLECTION_OFFER = 'collection_offer',
}

export enum OfferType {
  NORMAL = 'Normal',
  COLLECTION = 'Collection',
  SPECIFY = 'Specify',
}

// ref: https://docs.opensea.io/v2.0/reference/seaport-structs
export interface OfferItem {
  itemType: number;
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
}

export interface ConsiderationItem extends OfferItem {
  recipient: string;
}

export interface OfferOrConsiderationItem {
  itemType: number;
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
  recipient?: string;
}

export interface SpentItem {
  itemType: number;
  token: string;
  identifier: BigNumber;
  amount: BigNumber;
}

export interface ReceivedItem extends SpentItem {
  recipient: string;
}

export interface SeaportOrder {
  parameters: {
    offerer: string;
    offer: OfferItem[];
    consideration: ConsiderationItem[];
    zone: string;
    zoneHash: string;
    salt: string;
    conduitKey: string;
    totalOriginalConsiderationItems: number;
    counter: string;
    orderType: number;
    startTime: number;
    endTime: number;
  };
  signature: string;
}

export interface OrderAsset {
  startAmount: string;
  endAmount: string;
  contractId?: string;
  contractName?: string;
  contractAddress?: string;
  contractType?: string;
  assetName?: string;
  assetImageUrl?: string;
  assetImagePreviewUrl?: string;
  assetAnimationUrl?: string;
  assetAnimationType?: string;
  assetDescription?: string;
  assetBackgroundColor?: string;
  assetTraits?: string;
  assetTokenUri?: string | null;
  assetImageData?: string;
  assetTokenId?: string;
}
export interface OrderCurrency {
  startAmount: string;
  endAmount: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isNative: boolean;
  isWrapped: boolean;
  chainId: number;
}
export interface OrderResponse {
  category: string;
  hash: string;
  orderType: number;
  chainId: number;
  offerer: string;
  startTime: number;
  endTime: number;
  price: number;
  priceSymbol: string;
  isFillable: boolean;
  isCancelled: boolean;
  isExpired: boolean;
  isValidated: boolean;
  assets: OrderAsset[];
  currencies: OrderCurrency[];
  seaportOrder: SeaportOrder;
  exchangeAddress: string;
  platformType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderHistoryResponse {
  contractAddress: string;
  tokenId: string;
  amount: string;
  chainId: number;
  category: AssetEventCategory;
  startTime: string;
  endTime: string;
  price: number;
  currencySymbol: string;
  usdPrice: number;
  fromAddress: string;
  toAddress: string;
  hash: string;
  txHash: string;
}

export interface OrderListResponse {
  orders?: OrderResponse[] | null;
  count?: number | null;
}

export interface OrderFulfilledResponse {
  orderHash: string;
  offerer: string;
  zone: string;
  recipient: string;
  offer: SpentItem[];
  consideration: ReceivedItem[];
}

export interface OrderCancelledResponse {
  orderHash: string;
  offerer: string;
  zone: string;
}

export interface OrderHistoryListResponse {
  ordersHistory?: OrderHistoryResponse[] | null;
  count?: number | null;
}

export interface OrderCertification {
  chainId: string;
  orderHash: string;
  exchangeAddress: string;
  offererUsername: string;
  offererWalletAddress: string;
  isOrderFind: boolean;
  isOffererFind: boolean;
  isOffererBlocked: boolean;
  isAssetFind: boolean;
  isAssetBlocked: boolean;
  isCollectionFind: boolean;
  isCollectionBlocked: boolean;
}

export interface BestCollectionOfferOrder {
  hasBestCollectionOrder: boolean;
  bestSeaportOrder: SeaportOrderEntity;
  priceSymbol: string;
}

export interface CacheBestListing {
  id: string;
  hash: string;
  price: number;
  perPrice: number;
  startTime: number;
  endTime: number;
  chainId: number;
  exchangeAddress: string;
  platformType: number;
  // priceSymbol: string;
}
