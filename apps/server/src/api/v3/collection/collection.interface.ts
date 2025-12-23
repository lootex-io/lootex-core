import { Collection } from '@/model/entities/collection.entity';
import { Pagination } from '@/common/utils/utils.interface';
import { ExternalLink } from '@/common/utils/types';
import { ContractType } from '@/common/utils';
import { BestCollectionOfferOrder } from '../order/order.interface';

export interface UploadFile {
  url?: string;
}

export interface CollectionInfo {
  id?: string;
  chainId?: number | string;
  chainShortName: string;
  priceSymbol?: string;
  contractAddress: string;
  contractType?: string | ContractType;
  bannerImageUrl?: string;
  logoImageUrl?: string;
  featuredImageUrl?: string;
  featuredVideoUrl?: string;
  name: string;
  slug: string;
  description?: string;
  externalLinks?: Array<ExternalLink | any> | string;
  isVerified: boolean;
  isSensitive: boolean;
  isMinting: boolean;
  isCampaign202408Featured?: boolean;
  isDrop?: boolean;
  serviceFee: number;
  creatorFee: number;
  creatorFeeAddress?: string;
  isCreatorFee?: boolean;
  officialAddress?: string;
  likes?: number;
  items?: number;
  owners?: number;
  currency?: string;
  listingPercents?: number;
  floorPrice?: number;
  bestOffer?: number;
  currentListing?: number;
  currentOffer?: number;
  totalListing?: number;
  totalOffer?: number;
  totalOwners?: number;
  totalItems?: number;
  totalVolume?: string;
  totalTradingCount?: string;
  featured?: any[];
  ownerAddress?: string;
  bestCollectionOffer?: BestCollectionOfferOrder;
  relationGames?: any[];
}

export interface CreateCollectionOpt {
  chainShortName: string;
  contractAddress: string;
}

export interface ContractCacheFormat {
  queueStatus?: string;
  contractAddress?: string;
  chainId?: string;
}

export interface CollectionList {
  collections?: CollectionInfo[];
}

export interface CollectionOwnerAddress {
  ownerAddress?: string;
}

export interface CollectionExtends extends Collection {
  totalOwners?: number;
  totalVolume?: number;
  totalItems?: number;
  floorPrice?: number;
}

export interface CollectionListQuery {
  username?: string;
  holderUsername?: string;
  chainShortName?: string;
  limit: number;
  page: number;
}

export interface CollectionFindResponse {
  rows: CollectionExtends[];
  count: number;
}

export interface CollectionsApiResponse {
  collections: CollectionExtends[];
  pagination: Pagination;
}

export interface ExploreCollectionsByOpt {
  keywords: string[];
  limit: number;
  page: number;
  chainId?: string;
  username?: string;
  sortBy?: string[];
  tradingDays?: string; // alldays, 30days, 7days, today
  isVerified?: boolean;
  isSimple?: boolean;
  walletAddress?: string;
}

export enum CollectionVolumeViewTableName {
  ALL_DAY = 'collection_volume_all_days',
  SEVEN_DAY = 'collection_volume_seven_days',
  THIRTY_DAY = 'collection_volume_thirty_days',
  TODAY = 'collection_volume_today',
}

export enum TimeRange {
  ONE_HOUR = 'one_hour',
  ONE_DAY = 'one_day',
  ONE_WEEK = 'one_week',
  ONE_MONTH = 'one_month',
}
