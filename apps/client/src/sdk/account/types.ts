import type { Asset } from "../asset/types";
import type { ExternalLink } from "../collection/types";
type AccountWallet = {
  address: `0x${string}`;
  provider: "METAMASK_INJECTED" | "PRIVY_LIBRARY" | "PRIVY_LIBRARY_SA"; // TODO: what else do we have?
  chainFamily: string;
  isMainWallet: boolean;
};

type AccountBadge = {
  createdAt: string;
  deletedAt: string | null;
  description: string;
  id: string;
  name: string;
  updatedAt: string | null;
};

export type AccountGame = {
  provider: string;
  providerAccountId: string;
  name: string;
  email: string | null;
  picture: string;
  visibility: boolean;
  lootexVisibility: boolean;
};

export type AccountSocialToken = {
  email: string;
  name: string;
  picture: string;
  provider: string;
  providerAccountId: string;
};

export type Account = {
  AccountGameTokens: AccountGame[] | [];
  AccountSocialTokens: AccountSocialToken[] | [];
  AvatarDecoration: AccountBadge;
  avatarDecorationId: string;
  Badge: AccountBadge;
  avatarUrl: string;
  chainDataVisibility: boolean;
  createdAt: string;
  email: string;
  externalLinks: ExternalLink[];
  follower: number;
  following: number;
  introduction: string;
  roles: string[] | null;
  status: string;
  updatedAt: string | null;
  username: string;
  wallets: AccountWallet[];
  renameCount: number;
  id?: string;
};

export type OwnerAccount = {
  address: `0x${string}`;
  quantity: string;
} & Partial<Pick<Account, "avatarUrl" | "username" | "id" | "updatedAt">>;

export type FollowAccount = Pick<
  Account,
  | "avatarUrl"
  | "createdAt"
  | "externalLinks"
  | "follower"
  | "introduction"
  | "updatedAt"
  | "username"
> & {
  avatarDecoration: null;
  badge: null;
  isFollowing: boolean;
};

export type ReferralHistoryAccount = Pick<
  Account,
  "avatarUrl" | "createdAt" | "updatedAt" | "username"
> & {
  avatarDecoration: null;
  badge: null;
  category: string;
  s2BasicCompleted?: boolean;
};

export type OrderAccount = Pick<
  Account,
  "avatarUrl" | "wallets" | "username" | "AvatarDecoration"
>;

export const hasWallet = (account?: Account, walletAddress?: `0x${string}`) => {
  return !!account?.wallets?.find(
    (w) => w.address.toLowerCase() === walletAddress?.toLowerCase()
  );
};

// btw, why this is not called isAdmin?
export const isGM = (account?: Account) => {
  return !!account?.roles?.includes("admin");
};

export type FeaturedAsset = {
  asset: Asset;
  assetId: string;
  description: string;
  name: string;
  rank: number;
};

export type FeaturedAssetsSection = {
  description?: string;
  featuredAssets: FeaturedAsset[];
  name: string;
  rank: number;
};
