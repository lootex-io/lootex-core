import type { OwnerAccount } from '../../account/types.js';
import type {
  Account,
  FeaturedAsset,
  FeaturedAssetsSection,
  FollowAccount,
  ReferralHistoryAccount,
} from '../../account/types.js';
import type { Asset } from '../../asset/types.js';
import type { LootexCollection } from '../../collection/types.js';
import type { createRequest } from '../request.js';
import type { GetAssetsParams } from './asset.js';
import type { Media } from './entities.js';
import {
  type PaginatedParams,
  type PaginatedResponse,
  fileToFormData,
} from './utils.js';

export type GetMeParams = Record<string, never>;
export type GetMeResponse = Account;

export type UpdateMeParams = Pick<
  Account,
  'avatarUrl' | 'introduction' | 'externalLinks'
>;
export type UpdateMeResponse = Record<string, never>;

export type UpdateUsernameParams = {
  username: string;
};
export type UpdateUsernameResponse = {
  createdAt: string;
  updatedAt: string;
  id: string;
  accountId: string;
  beforeUsername: string;
  afterUsername: string;
  deletedAt: string | null;
};

export type GetAccountParams = {
  username?: string;
  walletAddress?: string;
  referralCode?: string;
};
export type GetAccountResponse = Account;

export type GetAccountsByAssetParams = PaginatedParams<{
  chainId?: number;
  contractAddress?: string;
  tokenId?: string;
}>;
export type GetAccountsByAssetResponse = PaginatedResponse<
  OwnerAccount,
  'accounts'
>;

export type GetAccountLikedAssetsParams = Omit<
  GetAssetsParams,
  'contractAddress' | 'walletAddress'
>;
export type GetAccountLikedAssetsResponse = PaginatedResponse<Asset, 'items'>;

export type GetAccountFeaturedAssetsParams = {
  username?: string;
};
export type GetAccountFeaturedAssetsResponse = FeaturedAssetsSection[];

export type FeatureAssetsParams = {
  featuredSections: Omit<FeaturedAssetsSection, 'featuredAssets'> &
    {
      featuredAssets: Omit<FeaturedAsset, 'asset'>[];
    }[];
};

export type GetAccountLikedCollectionsParams = PaginatedParams<{
  username?: string;
}>;
export type GetAccountLikedCollectionsResponse = PaginatedResponse<
  LootexCollection,
  'collections'
>;

export type GetAccountFollowedGamesParams = PaginatedParams<{
  username?: string;
}>;

export type GetFollowingOrFollowerParams = PaginatedParams<{
  username?: string;
}>;
export type GetFollowingOrFollowerResponse = PaginatedResponse<
  FollowAccount,
  'accounts'
>;

export type GetAccountMediaParams = {
  username?: string;
};
export type GetAccountMediaResponse = {
  medias: Media[];
};

export type UpdateAccountMediaParams = {
  medias: Pick<
    Media,
    'contentType' | 'description' | 'gameId' | 'name' | 'url'
  >[];
};
export type UpdateAccountMediaResponse = {
  medias: Media[];
};

export type GetReferralHistoryParams = PaginatedParams;
export type GetReferralHistoryResponse = PaginatedResponse<
  ReferralHistoryAccount,
  'accounts'
>;

export type GetReferralStatusResponse = {
  totalInvitees: number;
  referrerInfo: {
    name: string;
    avatarUrl: string;
    follower: number;
  } | null;
};

export type GetGameStatsOverviewParams = {
  username: string;
};
export type GetGameStatsOverviewResponse = {
  playGames: number;
  playHours: number;
  playYears: number;
  playGamesRanking: number;
  playHoursRanking: number;
  playYearsRanking: number;
};

export type GetSteamStatsParams = {
  username: string;
};
export type GetSteamStatsResponse = {
  averagePlayHours: number;
  freeGames: number;
  mostPlayedGame: string;
  mostPlayedGameHours: number;
  mostPlayedGameImageUrl: string;
  mostPlayedGenra: string;
  mostPlayedGenraHours: number;
  paidGames: number;
  playHoursOnFreeGames: number;
  playHoursOnPaidGames: number;
  playedGames: number;
  secondMostPlayedGame: string;
  secondMostPlayedGameHours: number;
  secondMostPlayedGameImageUrl: string;
};

export type SyncSteamStatsResponse = {
  status: string;
};

export type UpdateGameOrOnChainStatsVisibilityParams = {
  visibility: string;
};
export type UpdateGameOrOnChainStatsVisibilityResponse = {
  status: string;
};

export type ChainStat = {
  chain: number;
  totalNft: number | null;
  totalTx: number | null;
  totalGasFee: string | null;
};
export type GetOnChainStatsParams = {
  username: string;
};
export type GetOnChainStatsResponse = {
  accountId: string;
  totalNft: number;
  totalTx: number;
  visibility: boolean;
  nftRank: number;
  txRank: number;
  chains: ChainStat[];
};

export const createAccountEndpoints = (
  request: ReturnType<typeof createRequest>,
) => ({
  me: () => {
    return request<GetMeResponse>({
      method: 'GET',
      path: '/v3/accounts/profile',
    });
  },
  updateMe: (params: UpdateMeParams) => {
    return request<UpdateMeParams>({
      method: 'PUT',
      path: '/v3/accounts/profile',
      body: params,
    });
  },
  updateUsername: (params: UpdateUsernameParams) => {
    return request<UpdateUsernameResponse>({
      method: 'PUT',
      path: '/v3/accounts/username',
      query: params,
    });
  },
  getLikedAssets: (params: GetAccountLikedAssetsParams) => {
    return request<GetAccountLikedAssetsResponse>({
      method: 'GET',
      path: '/v3/accounts/like/assets',
      query: params,
    });
  },
  getLikedCollections: (params: GetAccountLikedCollectionsParams) => {
    return request<GetAccountLikedCollectionsResponse>({
      method: 'GET',
      path: '/v3/accounts/like/collections',
      query: params,
    });
  },
  getAccount: (params: GetAccountParams) => {
    return request<GetAccountResponse>({
      method: 'GET',
      path: '/v3/accounts',
      query: params,
    });
  },
  uploadProfileImage: (file: File) => {
    return request<{
      url: string;
    }>({
      method: 'POST',
      path: '/v3/accounts/avatar',
      body: fileToFormData(file),
    });
  },
  getAccountsByAsset: (params: GetAccountsByAssetParams) => {
    return request<GetAccountsByAssetResponse>({
      method: 'GET',
      path: '/v3/accounts/list/by-asset',
      query: params,
    });
  },
  likeAsset: (params: { assetId: string }) => {
    return request<boolean>({
      method: 'PUT',
      path: `/v3/accounts/like/asset/${params?.assetId}`,
    });
  },
  getAssetIsLikedByAccount: (params: { assetId: string }) => {
    return request<boolean>({
      method: 'GET',
      path: `/v3/accounts/like/asset/${params?.assetId}`,
    });
  },
  likeCollection: (params: { slug: string }) => {
    return request<boolean>({
      method: 'PUT',
      path: `/v3/accounts/like/collection/${params?.slug}`,
    });
  },
  getCollectionIsLikedByAccount: (params: { slug: string }) => {
    return request<boolean>({
      method: 'GET',
      path: `/v3/accounts/like/collection/${params?.slug}`,
    });
  },
  followAccount: (params: { username: string }) => {
    return request<boolean>({
      method: 'PUT',
      path: `/v3/accounts/follow/account/${params?.username}`,
    });
  },
  getAccountIsFollowing: (params: { username: string }) => {
    return request<boolean>({
      method: 'GET',
      path: `/v3/accounts/follow/account/${params?.username}`,
    });
  },
  followGame: (params: { gameId: string }) => {
    return request<boolean>({
      method: 'PUT',
      path: `/v3/accounts/follow/game/${params?.gameId}`,
    });
  },
  getGameIsFollowedByAccount: (params: { gameId: string }) => {
    return request<boolean>({
      method: 'GET',
      path: `/v3/accounts/follow/game/${params?.gameId}`,
    });
  },
  featureAssets: (params: FeatureAssetsParams) => {
    return request<boolean>({
      method: 'PUT',
      path: '/v3/accounts/featured/assets',
      body: params,
    });
  },
  getFeaturedAssets: (params: GetAccountFeaturedAssetsParams) => {
    return request<GetAccountFeaturedAssetsResponse>({
      method: 'GET',
      path: `/v3/accounts/featured/assets/${params?.username}`,
    });
  },
  getFollowing: (params: GetFollowingOrFollowerParams) => {
    return request<GetFollowingOrFollowerResponse>({
      method: 'GET',
      path: '/v3/accounts/following/accounts',
      query: params,
    });
  },
  getFollowers: (params: GetFollowingOrFollowerParams) => {
    return request<GetFollowingOrFollowerResponse>({
      method: 'GET',
      path: '/v3/accounts/follower/accounts',
      query: params,
    });
  },
  getMedia: (params: GetAccountMediaParams) => {
    return request<GetAccountMediaResponse>({
      method: 'GET',
      path: `/v3/accounts/profile-media/${params?.username}`,
    });
  },
  updateMedia: (params: UpdateAccountMediaParams) => {
    return request<UpdateAccountMediaResponse>({
      method: 'PUT',
      path: '/v3/accounts/profile-media',
      body: params,
    });
  },
  uploadImageMedia: (file: File) => {
    return request<{
      url: string;
    }>({
      method: 'POST',
      path: '/v3/accounts/upload/media-image',
      body: fileToFormData(file),
    });
  },
  uploadVideoMedia: (file: File) => {
    return request<{
      url: string;
    }>({
      method: 'POST',
      path: '/v3/accounts/upload/media-video',
      body: fileToFormData(file),
    });
  },
  getReferralHistory: (params: GetReferralHistoryParams) => {
    return request<GetReferralHistoryResponse>({
      method: 'GET',
      path: '/v3/accounts/referral',
      query: params,
    });
  },
  getReferralStatus: () => {
    return request<GetReferralStatusResponse>({
      method: 'GET',
      path: '/v3/accounts/referral/status',
    });
  },
  getGameStatsOverview: (params: GetGameStatsOverviewParams) => {
    return request<GetGameStatsOverviewResponse>({
      method: 'GET',
      path: `/v3/accounts/game-stats/${params?.username}`,
    });
  },
  getSteamStats: (params: GetSteamStatsParams) => {
    return request<GetSteamStatsResponse>({
      method: 'GET',
      path: `/v3/accounts/game-stats/steam/${params?.username}`,
    });
  },
  syncSteamStats: () => {
    return request<SyncSteamStatsResponse>({
      method: 'PUT',
      path: '/v3/accounts/game-stats/steam/sync',
    });
  },
  updateGameStatsVisibility: (
    params: UpdateGameOrOnChainStatsVisibilityParams,
  ) => {
    return request<UpdateGameOrOnChainStatsVisibilityResponse>({
      method: 'PUT',
      path: '/v3/accounts/game-stats/visibility',
      body: params,
    });
  },
  getOnChainStats: (params: GetOnChainStatsParams) => {
    return request<GetOnChainStatsResponse>({
      method: 'GET',
      path: '/v3/accounts/onchain-stats/summary',
      query: params,
    });
  },
  updateOnChainStatsVisibility: (
    params: UpdateGameOrOnChainStatsVisibilityParams,
  ) => {
    return request<UpdateGameOrOnChainStatsVisibilityResponse>({
      method: 'PUT',
      path: '/v3/accounts/onchain-stats/visibility',
      body: params,
    });
  },
});
