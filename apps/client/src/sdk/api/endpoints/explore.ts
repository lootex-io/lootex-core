import type { Account } from '../../account/types';
import type { Asset } from '../../asset/types';
import type { createRequest } from '../request';

import type { GetAssetsParams, GetAssetsResponse } from './asset';
import type {
  GetCollectionsParams,
  GetCollectionsResponse,
} from './collection';
import type { PaginatedParams, PaginatedResponse } from './utils';

export type GetAccountsParams = PaginatedParams<{
  keywords?: string;
}>;
export type GetAccountsResponse = PaginatedResponse<Account, 'accounts'>;


export type ExploreDailyAssetsResponse = {
  items: Asset[];
  pagination: {
    page: number;
    totalPage: number;
    limitPerPage: number;
    count: number;
  };
};

export const createExploreEndpoints = (
  request: ReturnType<typeof createRequest>,
) => ({
  assets: (params: GetAssetsParams) => {
    return request<GetAssetsResponse>({
      method: 'GET',
      path: '/v3/explore/assets',
      query: params,
    });
  },
  collections: (params: Partial<GetCollectionsParams>) => {
    return request<GetCollectionsResponse>({
      method: 'GET',
      path: '/v3/explore/collections',
      query: params,
    });
  },
  accounts: (params: GetAccountsParams) => {
    return request<GetAccountsResponse>({
      method: 'GET',
      path: '/v3/explore/users',
      query: params,
    });
  },
  dailyAssets: () => {
    return request<ExploreDailyAssetsResponse>({
      method: 'GET',
      path: '/v3/explore/assets-by-daily',
    });
  },
});
