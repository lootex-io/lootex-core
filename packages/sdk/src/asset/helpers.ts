import { getChain } from '../chains/constants.js';
import type {
  CollectionFeaturedAsset,
  LootexCollection,
} from '../collection/types.js';
import type { LootexOrderSimple } from '../order/types.js';
import type { Asset } from './types.js';

/**
 * Checks if the given asset is an ERC1155 token
 * @param asset - The asset to check
 * @returns True if the asset is an ERC1155 token, false otherwise
 */
export const isErc1155Asset = (asset?: Asset): boolean => {
  return asset?.contractType === 'ERC1155';
};

/**
 * Checks if the given asset is an ERC721 token
 * @param asset - The asset to check
 * @returns True if the asset is an ERC721 token, false otherwise
 */
export const isErc721Asset = (asset?: Asset): boolean => {
  return asset?.contractType === 'ERC721';
};

/**
 * Generates a unique identifier for an asset
 * @param asset - The asset to generate an ID for
 * @returns A string in the format "chainShortName/contractAddress/assetTokenId" or undefined if required fields are missing
 */
export const getAssetId = (asset?: Asset): string | undefined => {
  if (!asset) return undefined;

  const {
    assetTokenId,
    contractAddress,
    collectionChainShortName,
    contractChainId,
  } = asset;

  const chainShortName =
    collectionChainShortName ||
    (!!contractChainId && getChain(contractChainId)?.shortName) ||
    undefined;

  if (!chainShortName || !contractAddress || !assetTokenId) return undefined;

  return `${chainShortName}/${contractAddress}/${assetTokenId}`;
};

/**
 * Gets the best offer (highest unit price) for an asset from its regular and collection offers
 * @param asset - The asset to get the best offer for
 * @returns The offer with the highest unit price or undefined if no offers exist
 */
export const getAssetBestOffer = (
  asset?: Asset,
): LootexOrderSimple | undefined => {
  if (!asset?.order) return undefined;

  return [asset.order.offer, asset.order.collectionOffer]
    .filter((offer) => !!offer) // exclude nully values
    .sort((a, b) => b.perPrice - a.perPrice)?.[0]; // sort by perPrice from high to low
};

/**
 * Converts a featured asset from a collection to a simplified version of standard asset format
 * @param collection - The collection containing the featured asset
 * @param featuredAsset - The featured asset to convert
 * @returns The asset in a simplified standard format, including relevant collection details
 */
export const collectionFeaturedAssetToAsset = (
  collection: LootexCollection,
  featuredAsset: CollectionFeaturedAsset,
): Asset => {
  return {
    id: featuredAsset.id,
    assetName: featuredAsset.name,
    assetImageUrl: featuredAsset.imageUrl,
    assetTokenId: featuredAsset.tokenId,
    assetId: featuredAsset.id,
    collectionName: collection.name,
    contractChainId: featuredAsset?.chainId || Number(collection.chainId),
    contractAddress: collection.contractAddress,
    collectionChainShortName: collection.chainShortName,
    collectionSlug: collection.slug,
    collectionIsVerified: collection.isVerified,
    contractType: collection.contractType,
    collectionContractAddress: collection.contractAddress,
    collectionServiceFee: collection.serviceFee,
    collectionCreatorFee: collection.creatorFee,
    collectionOwnerAddress: collection.ownerAddress,
    order: {
      listing: null,
      offer: null,
      collectionOffer: null,
    },
    assetRarityRanking: featuredAsset?.AssetExtra?.rarityRanking,
    contractTotalSupply: featuredAsset?.Contract?.totalSupply,
    collectionCreatorFeeAddress: collection.creatorFeeAddress,
    collectionIsCreatorFee: collection.isCreatorFee,
  };
};
