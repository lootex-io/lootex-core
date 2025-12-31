import type { LootexCollectionMetadata } from '../../collection/types.js';
import type { LootexCollection } from '../../collection/types.js';
import type { PlatformType } from '../../order/types.js';
import type { createRequest } from '../request.js';
import type { ClaimCondition, StudioContract } from './studio.js';
import {
  type PaginatedParams,
  type PaginatedResponse,
  fileToFormData,
} from './utils.js';

export type SyncCollectionMetadataParams = {
  chainId: string;
  contractAddress: string;
  force: string;
};

export type CollectionTradingDays = 'today' | '7days' | '30days';
export type GetCollectionsParams = PaginatedParams<{
  chainId?: number | string;
  sortBy?: '-tradingVolume' | '-tradingCount' | '-likes';
  tradingDays?: CollectionTradingDays;
  username?: string;
  keywords?: string;
  isVerified?: boolean;
  isSimple?: boolean;
}>;
export type GetCollectionsResponse = PaginatedResponse<
  LootexCollection,
  'collections'
>;

export type GetAccountCollectionsParams = PaginatedParams<{
  username: string;
}>;
export type GetAccountCollectionsResponse = PaginatedResponse<
  LootexCollection,
  'collections'
>;

export type GetMantleCollectionsParams = PaginatedParams;
export type GetMantleCollectionsResponse = PaginatedResponse<
  LootexCollection,
  'collections'
>;

export type ImportCollectionParams = {
  chainShortName: string;
  contractAddress: `0x${string}`;
};

export type UpdateCollectionParams = Partial<LootexCollection>;

export type TraitValue =
  | number
  | {
      count: number;
      rarityPercent: number | null;
    };
export type Trait = {
  traitType: string;
  traitValueCountMap: Record<string, TraitValue>;
};
export type GetCollectionTraitsParams = {
  collectionSlug: string;
  ownerAddresses?: string[];
};
export type GetCollectionTraitsResponse = {
  traits: Record<string, Record<string, TraitValue>>;
};
export type GetCollectionTraitsReturn = {
  traits: Trait[] | [];
};

export type GetCollectionTradingBoardParams = PaginatedParams<{
  timeRange: 'one_hour' | 'one_day' | 'one_week' | 'one_month';
  chainId?: number;
}>;
export type GetCollectionTradingBoardResponse = PaginatedResponse<
  {
    truncatedTime: string;
    chainId: number;
    contractAddress: `0x${string}`;
    tradingVolume: string;
    tradingCount: string;
    minFloorPrice: string;
    previousVolume: string;
    volumeChangePercent: string;
    previousFloorPrice: string;
    collectionId: string;
    logoImageUrl: string;
    name: string;
    isVerified: boolean;
    slug: string;
    chainShortName: string;
    totalSupply: string;
    totalOwners: string;
    floorPriceChangePercent: number;
    bestListing: {
      id: string;
      hash: `0x${string}`;
      price: number;
      perPrice: number;
      startTime: number;
      endTime: number;
      chainId: number;
      exchangeAddress: `0x${string}`;
      platformType: PlatformType;
    };
    bestCollectionOffer: {
      hasBestCollectionOrder: boolean;
      bestSeaportOrder: null;
      priceSymbol: null;
    };
    listing: number;
    symbol: string;
  },
  'tradingBoard'
>;

export type GetCollectionDropInfoParams = {
  slug: string;
  tokenId?: number;
};
export type GetCollectionDropInfoResponse = {
  contract: Pick<
    StudioContract,
    'address' | 'dropUrls' | 'dropName' | 'dropDescription' | 'id' | 'name'
  > & {
    drops: Pick<
      ClaimCondition,
      | 'id'
      | 'startTime'
      | 'price'
      | 'allowlist'
      | 'amount'
      | 'limitPerWallet'
      | 'currency'
    >[];
    schemaName: 'ERC721' | 'ERC1155';
  };
};

export const createCollectionEndpoints = (
  request: ReturnType<typeof createRequest>,
) => ({
  personal: (params: Partial<GetCollectionsParams>) => {
    return request<GetCollectionsResponse>({
      method: 'GET',
      path: '/v3/collections/personal',
      query: params,
    });
  },
  getMetadata: (collectionSlug: string) => {
    return request<LootexCollectionMetadata>({
      method: 'GET',
      path: `/v3/collections/${collectionSlug}/simple`,
    });
  },
  getTraits: (params: GetCollectionTraitsParams) => {
    const { ownerAddresses, ...restParams } = params;
    if (ownerAddresses?.length) {
      return request<GetCollectionTraitsResponse>({
        method: 'GET',
        path: '/v3/traits/account-owned',
        query: params,
      });
    }
    return request<GetCollectionTraitsResponse>({
      method: 'GET',
      path: '/v3/traits',
      query: restParams,
    });
  },
  getCollection: (collectionSlug: string) => {
    return request<LootexCollection>({
      method: 'GET',
      path: `/v3/collections/${collectionSlug}`,
    });
  },
  getCollectionsBySlugs: (params: { slugs: string[] }) => {
    return request<LootexCollection[]>({
      method: 'GET',
      path: '/v3/collections/by-collection-slugs',
      query: params,
    });
  },
  getAccountCollections: (params: GetAccountCollectionsParams) => {
    return request<GetAccountCollectionsResponse>({
      method: 'GET',
      path: '/v3/collections',
      query: params,
    });
  },
  uploadLogo: (file: File) => {
    return request<{
      url: string;
    }>({
      method: 'POST',
      path: '/v3/collections/upload-logo',
      body: fileToFormData(file),
    });
  },
  uploadBanner: (file: File) => {
    return request<{
      url: string;
    }>({
      method: 'POST',
      path: '/v3/collections/upload-banner',
      body: fileToFormData(file),
    });
  },
  uploadFeatured: (file: File) => {
    return request<{
      url: string;
    }>({
      method: 'POST',
      path: '/v3/collections/upload-featured-image',
      body: fileToFormData(file),
    });
  },
  import: (params: ImportCollectionParams) => {
    return request<LootexCollection>({
      method: 'POST',
      path: '/v3/collections',
      body: params,
    });
  },
  updateCollection: (params: UpdateCollectionParams) => {
    return request<LootexCollection>({
      method: 'PUT',
      path: `/v3/collections/${params?.slug}`,
      body: params,
    });
  },
  getMantleCollections: (params: GetMantleCollectionsParams) => {
    return request<GetMantleCollectionsResponse>({
      method: 'GET',
      path: '/v3/collections/mantle',
      query: params,
    });
  },
  updateVerification: (params: { slug: string }) => {
    return request({
      method: 'PUT',
      path: `/v3/collections/${params.slug}/is-verified`,
    });
  },
  getTradingBoard: (params: GetCollectionTradingBoardParams) => {
    return request<GetCollectionTradingBoardResponse>({
      method: 'GET',
      path: '/v3/collections/trading-board',
      query: params,
    });
  },
  getCollectionDropInfo: (params: GetCollectionDropInfoParams) => {
    const { slug, ...restParams } = params;
    return request<GetCollectionDropInfoResponse>({
      method: 'GET',
      path: `/v3/collections/${slug}/drop`,
      query: restParams,
    });
  },
});
