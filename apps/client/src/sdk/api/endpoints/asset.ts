import type { createRequest } from '../request';

import type { Account } from '../../account/types';
import type { Asset } from '../../asset/types';
import type { PlatformType } from '../../order/types';
import type { PaginatedParams, PaginatedResponse } from './utils';

export type GetAssetsParams = PaginatedParams<{
  username?: string;
  chainId?: string;
  contractAddress?: string;
  collectionSlugs?: string[];
  sortBy?:
    | '-createdAt'
    | '-bestListPrice'
    | 'bestListPrice'
    | '-bestOfferPrice'
    | '-likeCount'
    | 'lastCreatedListingAt'
    | 'rarityRanking'
    | '-rarityRanking';
  orderStatus?: string[];
  walletAddress?: string;
  priceSymbol?: string;
  priceMin?: string;
  priceMax?: string;
  traits?: string;
  keywords?: string;
  platformType?: PlatformType;
  isVerified?: boolean;
  isCount?: boolean;
}>;
export type GetAssetsResponse = PaginatedResponse<Asset, 'items'>;

export type GetAssetResponse = Asset;

export type GetAssetLikesParams = PaginatedParams<{
  id: string;
}>;
export type GetAssetLikesResponse = PaginatedResponse<
  Partial<Account>,
  'accounts'
>;

export type GetAssetCountParams = {
  username: string;
};
export type GetAssetCountResponse = {
  count: number;
};

export type SyncCollectionMetadataParams = {
  chainId: string;
  contractAddress: string;
  force: string;
};

export const createAssetEndpoints = (
  request: ReturnType<typeof createRequest>,
) => ({
  getAsset: (assetId: string) => {
    return request<GetAssetResponse>({
      method: 'GET',
      path: `/v3/assets/${assetId}`,
    });
  },
  syncAsset: (assetId: string) => {
    return request({
      method: 'POST',
      path: `/v3/assets/${assetId}/sync`,
    });
  },
  syncMyAssets: () => {
    return request({
      method: 'GET',
      path: '/v3/assets/fetch',
    });
  },
  // why is this in asset endpoints?
  syncCollectionMetadata: (params: SyncCollectionMetadataParams) => {
    return request({
      method: 'GET',
      path: '/v3/assets/syncCollection',
      query: params,
    });
  },
  syncContractAssets: (contractId: string) => {
    return request({
      method: 'POST',
      path: `/v3/assets/${contractId}/sync`,
    });
  },
  getAssetLikes: (params: GetAssetLikesParams) => {
    return request<GetAssetLikesResponse>({
      method: 'GET',
      path: '/v3/assets/likes',
      query: params,
    });
  },
  getAssetsCount: (params: GetAssetCountParams) => {
    return request<GetAssetCountResponse>({
      method: 'GET',
      path: '/v3/assets/count',
      query: params,
    });
  },
});
