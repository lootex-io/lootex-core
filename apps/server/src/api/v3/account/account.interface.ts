import { Pagination } from '@/common/utils/utils.interface';
import {
  AccountAvatarDecoration,
  AccountBadge,
  AccountSocialToken,
  AvatarDecoration,
  Badge,
  Wallet,
} from '@/model/entities';
import { Role } from '../role/role.interface';

export interface UploadFile {
  url?: string;
}

export interface GetAccountsQuery {
  page: number;
  limit: number;
  chainId?: string;
  contractAddress?: string;
  tokenId?: string;
}

export interface GetAccountQuery {
  walletAddress?: string;
  username?: string;
  email?: string;
  referralCode?: string;
}

export interface ReturnAccountResponse {
  username: string;
  fullname: string;
  avatarUrl: string;
  introduction: string;
  status: string;
  externalLinks: string;
  wallets: Array<Wallet>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
  roles: Array<Role>;

  badgeId: string;
  avatarDecorationId: string;
  referralCode: string;
  Badges: Array<AccountBadge>;
  Badge: Badge;
  AvatarDecoration: AvatarDecoration;
  AvatarDecorations: Array<AccountAvatarDecoration>;

  AccountSocialTokens: Array<AccountSocialToken>;

  follower: number;
  following: number;
}

export interface GetAccountResponse extends ReturnAccountResponse {
  id: string;
  email: string;
}

export interface GetAccountsResponse {
  // queueStatus?: string;
  accounts: {
    username: string;
    avatarUrl: string;
    address: string;
    quantity?: string;
    updatedAt: string;
  }[];
  count: number;
}

export interface AccountsResponse {
  accounts: GetAccountsResponse[];
  pagination: Pagination;
}

export interface ExploreUsersByOpt {
  keywords: string[];
  limit: number;
  page: number;
}

export interface GetAccountFollow {
  username: string;
  limit: number;
  page: number;
}

export interface FeaturedAssetSection {
  name: string;
  description: string;
  rank: number;
  featuredAssets: FeaturedAsset[];
}

export interface FeaturedAsset {
  name: string;
  description: string;
  assetId: string;
  rank: number;
  asset?: any;
}

export const AccountAttributes = [
  'id',
  'username',
  'fullname',
  'avatarUrl',
  'introduction',
  'status',
  'createdAt',
  'updatedAt',
  'externalLinks',
  'roles',
  'referralCode',
  'block',
];

export const AccountMinAttributes = ['username', 'avatarUrl', 'block'];
