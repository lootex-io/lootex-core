import { Category } from '@/api/v3/order/order.interface';
import { ChainId } from '@/common/utils/types';
import { Asset } from '@/model/entities/asset.entity';
import { TraitQuery } from '@/api/v3/trait/trait.interface';
import { ContractType } from '@/common/utils';

export class Traits {
  traitType: string;
  value: string;
}
export interface FindQuery {
  ownerAddress?: string;
  chainId?: string;
  collectionSlug?: string;
  page?: number;
  limit?: number;
  traits?: Traits[];
}

export interface FindResponse {
  rows: Asset[];
  count: number;
}

export interface AssetResponse {
  contractId?: string;
  contractName?: string;
  contractAddress?: string;
  contractType?: string;
  contractChainId?: number;
  assetId?: string;
  assetName?: string;
  assetImageUrl?: string;
  assetImagePreviewUrl?: string;
  assetAnimationUrl?: string;
  assetAnimationType?: string;
  assetDescription?: string;
  assetBackgroundColor?: string;
  assetTraits?: any[];
  assetTokenUri?: string;
  assetLikesCount?: number;
  assetImageData?: string;
  assetTokenId?: string;
  collectionId?: string;
  collectionSlug?: string;
  collectionName?: string;
  collectionContractAddress?: string;
  collectionServiceFee?: number;
  collectionCreatorFee?: number;
  collectionOwnerAddress?: string;
  collectionLogoImageUrl?: string;
  collectionExternalLinks?: string;
  collectionIsVerified?: boolean;
  owners?: any[];
  order?: any;
}

export interface AssetListResponse {
  queueStatus?: string;
  rows?: AssetResponse[];
  count?: number;
}

export interface AssetUpdateQueue {
  queueStatus?: string;
  ownerAddress?: string;
  chainId?: string;
}

export interface AssetMetadataUpdateQueue {
  queueStatus: string;
  contractAddress: string;
  chainId: string;
  tokenId: string;
}

export interface AssetOwnersUpdateQueue {
  queueStatus: string;
  contractAddress: string;
  chainId: string;
  tokenId: string;
}

export interface UpdateOwnerAssetsFromQueue {
  ownerAddress: string;
  chainId: ChainId;
  limit?: number;
  cursor?: string;
}

export interface UpdateAssetsMetadataFromQueue {
  contractAddress: string;
  tokenId: string;
  chainId: ChainId;
}

export interface UpdateContractAssetsFromQueue {
  contractAddress: string;
  chainId: ChainId;
  limit?: number;
  cursor?: string;
}

export interface GetAssetByContractQuery {
  contractAddress: string;
  chainId: string;
  page?: number;
  limit?: number;
  traits?: TraitQuery;
}

export interface FindByFamily {
  chainShortName: string;
  contractAddress: string;
  tokenId: string;
}

export enum AssetEventCategory {
  'LIST' = 'list',
  'OFFER' = 'offer',
  'SALE' = 'sale',
  'COLLECTION_OFFER' = 'collection_offer',
  'TRANSFER' = 'transfer',
  'MINT' = 'mint',
  'AIRDROP' = 'airdrop',
  'BURN' = 'burn',
  'CANCEL' = 'cancel',
}

export interface ExploreAssetsByOpt {
  keywords?: string[];
  priceMin?: string;
  priceMax?: string;
  priceSymbol?: string;
  orderStatus?: Category[];
  traits?: Traits[];
  username?: string;
  walletAddress?: string;
  collectionSlugs?: string[];
  chainId: string;
  limit: number;
  page: number;
}

export interface GetAssetUserHolding {
  contractAddress: string;
  tokenId: string;
  chainId: string;
  ownerAddress?: string;
  username?: string;
}

export interface AssetKey {
  contractAddress: string;
  tokenId: string;
  chainId: ChainId;
}

export interface updateAssetOwnershipByAssetId {
  assetId: string;
  ownerAddress: string;
  schemaName: ContractType;
  amount: string;
}
export interface TransferAssetOwnershipOnchain {
  contractAddress: string;
  tokenId: string;
  chainId: ChainId;
  fromAddress: string;
  toAddress: string;
}

export interface SimpleAsset {
  contractAddress: string;
  tokenId: string;
  chainId: ChainId;
  name: string;
  imageUrl: string;
  imagePreviewUrl: string;
}
