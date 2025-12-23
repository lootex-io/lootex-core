import type { LootexOrderSimple } from '../order/types.js';

export type AssetTrait = {
  trait_type: string;
  value: string;
  total_count?: number;
  rarity_percent?: number;
};

export type Asset = {
  id: string;
  assetId: string;
  assetName: string;
  assetImageUrl: string;
  assetImagePreviewUrl?: string;
  assetAnimationUrl?: string;
  assetAnimationType?: string;
  assetDescription?: string;
  assetBackgroundColor?: string;
  assetExternalUrl?: string;
  assetImageData?: string;
  assetTraits?: AssetTrait[];
  assetTokenUri?: string;
  assetTokenId: string;
  assetTotalOwners?: number;
  assetTotalAmount?: string;
  assetLikesCount?: number;
  assetViewCount?: number;
  contractId?: string;
  contractName?: string;
  contractChainId?: number;
  contractAddress: `0x${string}`;
  contractType: 'ERC1155' | 'ERC721';
  collectionId?: string;
  collectionChainShortName: string;
  collectionLogoImageUrl?: string;
  collectionSlug: string;
  collectionName: string;
  collectionContractAddress: `0x${string}`;
  collectionServiceFee: string;
  collectionCreatorFee: string;
  collectionOwnerAddress: `0x${string}`;
  collectionCreatorFeeAddress: `0x${string}` | null;
  collectionIsCreatorFee: boolean;
  collectionIsVerified: boolean;
  collectionIsCampaign202408Featured?: boolean;
  order: {
    listing: LootexOrderSimple | null;
    offer: LootexOrderSimple | null;
    collectionOffer: LootexOrderSimple | null;
  } | null;
  exchangeAddress?: `0x${string}`;
  assetRarityRanking?: number;
  contractTotalSupply?: string;
};
