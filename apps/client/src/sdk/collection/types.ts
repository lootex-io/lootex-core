import type { LootexOrder } from "../order/types";

export type CollectionFeaturedAsset = {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  tokenId: string;
  chainId?: number;
  AssetExtra?: {
    rarityRanking?: number;
  };
  Contract?: {
    totalSupply?: string;
  };
};

export type ExternalLink = {
  name: string;
  placeholder: string;
  iconName: string;
  url: string;
};

export type LootexCollection = {
  bannerImageUrl: string | null;
  bestCollectionOffer: {
    bestSeaportOrder: LootexOrder;
    hasBestCollectionOrder: boolean;
    priceSymbol: string | null;
  } | null;
  chainId: string;
  chainShortName: string;
  contractAddress: `0x${string}`;
  contractType: "ERC721" | "ERC1155";
  creatorFee: string;
  creatorFeeAddress: `0x${string}` | null;
  currentListing: number;
  currentOffer: number;
  description: string | null;
  externalLinks: ExternalLink[] | null;
  featured: CollectionFeaturedAsset[]; // TODO add back when Asset domain is ready
  featuredImageUrl: string | null;
  featuredVideoUrl: string | null;
  floorPrice: number;
  id: string;
  isSensitive: boolean;
  isVerified: boolean;
  likes: number;
  logoImageUrl: string | null;
  name: string;
  officialAddress: `0x${string}` | string | null;
  ownerAddress: `0x${string}`;
  priceSymbol: string;
  // relationGames: Game[]; // TODO add back when Game domain is ready
  serviceFee: string;
  slug: string;
  totalItems: number;
  totalListing: number;
  totalOffer: number;
  totalOwners: number;
  totalTradingCount: string;
  totalVolume: number;
  isLike?: boolean;
  bestOffer?: number;
  orderInfo?: {
    bestOffer: number;
    currentListing: number;
    floorPrice: number;
    totalVolume: number;
  };
  isDrop?: boolean;
  isCreatorFee: boolean;
};

export type LootexCollectionMetadata = Omit<
  LootexCollection,
  | "bestCollectionOffer"
  | "chainId"
  | "contractType"
  | "currentListing"
  | "currentOffer"
  | "floorPrice"
  | "likesCount"
  | "priceSymbol"
  | "totalItems"
  | "totalListing"
  | "totalOffer"
  | "totalOwners"
  | "totalTradingCount"
  | "totalVolume"
> & {
  chainId: number;
  verifiedCollection: boolean;
};
