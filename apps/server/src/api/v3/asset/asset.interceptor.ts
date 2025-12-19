import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  AssetListResponse,
  AssetResponse,
} from '@/api/v3/asset/asset.interface';
import { pagination, parseLimit } from '@/common/utils/pagination';

@Injectable()
export class AssetList implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<AssetListResponse> {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        queueStatus: data?.queueStatus,
        items: data.rows
          ? data.rows.map((asset) => {
              return {
                contractId: asset.Contract?.id,
                contractName: asset.Contract?.name,
                contractAddress: asset.Contract?.address,
                contractType: asset.Contract?.schemaName,
                contractChainId: asset.Contract?.chainId,
                assetId: asset.id,
                assetName: asset.name,
                assetImageUrl: asset.imageUrl,
                assetImagePreviewUrl: asset.imagePreviewUrl,
                assetAnimationUrl: asset.animationUrl,
                assetAnimationType: asset.animationType,
                assetDescription: asset.description,
                assetBackgroundColor: asset.backgroundColor,
                assetExternalUrl: asset.externalUrl,
                assetTraits: asset.traits,
                assetXTraits: asset.Xtraits,
                assetTokenUri: asset.tokenUri,
                assetImageData: 'TBD',
                assetTokenId: asset.tokenId,
                assetTotalOwners: asset.totalOwners,
                assetTotalAmount: asset.totalAmount,
                assetLikesCount: asset.likesCount,
                collectionId: asset.Collection?.id,
                collectionChainShortName: asset.Collection?.chainShortName,
                collectionSlug: asset.Collection?.slug,
                collectionName: asset.Collection?.name,
                collectionContractAddress: asset.Collection?.contractAddress,
                collectionServiceFee: asset.Collection?.serviceFee,
                collectionCreatorFee: asset.Collection?.creatorFee,
                collectionOwnerAddress: asset.Collection?.ownerAddress,
                collectionLogoImageUrl: asset.Collection?.logoImageUrl,
                collectionExternalLinks: asset.Collection?.externalLinks,
                collectionIsVerified: asset.Collection?.isVerified,
                owners: asset.AssetAsEthAccount?.map((owner) => {
                  return {
                    username: owner.Wallet?.Account?.username,
                    avatarUrl: owner.Wallet?.Account?.avatarUrl,
                    ownerAddress: owner.ownerAddress,
                    quantity: owner.quantity,
                    updatedAt: owner.updatedAt,
                  };
                }),
                order: asset.order ? asset.order : null,
              };
            })
          : [],
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}

@Injectable()
export class NewAssetList implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<AssetListResponse> {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        queueStatus: data?.queueStatus,
        items: data.rows
          ? data.rows
              .map((extra) => {
                const asset = extra.Asset;
                const contract = extra.Contract;
                const collection = extra.Collection;
                // 防呆：asset 或 asset.id 為 null 時 log
                if (!asset || !asset.id) {
                  // eslint-disable-next-line no-console
                  console.warn('[防呆] asset 或 asset.id 為 null', {
                    extraId: extra.id,
                    asset: asset,
                    contractId: contract?.id,
                    contractAddress: contract?.address,
                    assetTokenId: asset?.tokenId,
                    collectionId: collection?.id,
                    collectionContractAddress: collection?.contractAddress,
                  });
                  return null;
                }
                const order =
                  extra.bestListingOrder ||
                  extra.bestOfferOrder ||
                  extra.bestCollectionOfferOrder
                    ? {
                        listing: extra.bestListingOrder
                          ? {
                              id: extra.bestListingOrder?.id,
                              offerer: extra.bestListingOrder?.offerer,
                              price: extra.bestListingOrder.price,
                              perPrice: extra.bestListingOrder.perPrice,
                              priceSymbol: extra.bestListingSymbol,
                              startAmount:
                                extra.bestOfferOrder?.SeaportOrderAssets?.find(
                                  (asset) => asset.itemType > 1,
                                )?.startAmount,
                              availableAmount:
                                extra.bestOfferOrder?.SeaportOrderAssets?.find(
                                  (asset) => asset.itemType > 1,
                                )?.availableAmount,
                              hash: extra.bestListingOrder?.hash,
                              category: extra.bestListingOrder?.category,
                              startTime: new Date(
                                extra.bestListingOrder?.startTime * 1000,
                              ),
                              endTime: new Date(
                                extra.bestListingOrder?.endTime * 1000,
                              ),
                              platformType:
                                extra.bestListingOrder?.platformType,
                              exchangeAddress:
                                extra.bestListingOrder?.exchangeAddress,
                              is0PlatformFee: !!(
                                (extra.bestListingOrder?.SeaportOrderAssets?.find(
                                  // 分潤地址 0
                                  (asset) =>
                                    asset.recipient ===
                                      '0x44bC1E612e11d0Acd2c43218Ea55717aC28e3a40' &&
                                    asset.startAmount == '0',
                                ) ||
                                  !extra.bestListingOrder?.SeaportOrderAssets?.find(
                                    // 或沒有分潤地址
                                    (asset) =>
                                      asset.recipient ===
                                      '0x44bC1E612e11d0Acd2c43218Ea55717aC28e3a40',
                                  )) &&
                                extra.bestListingOrder?.platformType == 0
                              ),
                            }
                          : null,
                        offer: extra.bestOfferOrder
                          ? {
                              id: extra.bestOfferOrder?.id,
                              offerer: extra.bestOfferOrder?.offerer,
                              price: extra.bestOfferOrder?.price,
                              perPrice: extra.bestOfferOrder.perPrice,
                              priceSymbol: extra.bestOfferSymbol,
                              startAmount:
                                extra.bestOfferOrder?.SeaportOrderAssets?.find(
                                  (asset) => asset.itemType > 1,
                                )?.startAmount,
                              availableAmount:
                                extra.bestOfferOrder?.SeaportOrderAssets?.find(
                                  (asset) => asset.itemType > 1,
                                )?.availableAmount,
                              hash: extra.bestOfferOrder?.hash,
                              category: extra.bestOfferOrder?.category,
                              startTime: new Date(
                                extra.bestOfferOrder?.startTime * 1000,
                              ),
                              endTime: new Date(
                                extra.bestOfferOrder?.endTime * 1000,
                              ),
                              platformType: extra.bestOfferOrder?.platformType,
                              exchangeAddress:
                                extra.bestOfferOrder?.exchangeAddress,
                            }
                          : null,
                        collectionOffer:
                          extra.bestCollectionOfferOrder
                            ?.hasBestCollectionOrder === true ||
                          !extra.bestCollectionOfferOrder
                            ? {
                                id: extra.bestCollectionOfferOrder
                                  ?.bestSeaportOrder?.id,
                                offerer:
                                  extra.bestCollectionOfferOrder
                                    ?.bestSeaportOrder?.offerer,
                                price:
                                  extra.bestCollectionOfferOrder
                                    ?.bestSeaportOrder?.price,
                                perPrice:
                                  extra.bestCollectionOfferOrder
                                    ?.bestSeaportOrder?.perPrice,
                                priceSymbol:
                                  extra.bestCollectionOfferOrder?.priceSymbol,
                                startAmount:
                                  extra.bestCollectionOfferOrder
                                    ?.bestSeaportOrder?.SeaportOrderAssets?.[0]
                                    ?.startAmount,
                                availableAmount:
                                  extra.bestCollectionOfferOrder
                                    ?.bestSeaportOrder?.SeaportOrderAssets?.[0]
                                    ?.availableAmount,
                                hash: extra.bestCollectionOfferOrder
                                  ?.bestSeaportOrder?.hash,
                                category:
                                  extra.bestCollectionOfferOrder
                                    ?.bestSeaportOrder?.category,
                                startTime: new Date(
                                  extra.bestCollectionOfferOrder
                                    ?.bestSeaportOrder?.startTime * 1000,
                                ),
                                endTime: new Date(
                                  extra.bestCollectionOfferOrder
                                    ?.bestSeaportOrder?.endTime * 1000,
                                ),
                                exchangeAddress:
                                  extra.bestCollectionOfferOrder
                                    ?.bestSeaportOrder?.exchangeAddress,
                              }
                            : null,
                      }
                    : null;
                const allowCurrencies = extra.allowCurrencies ?? [];

                return {
                  contractId: contract.id,
                  contractName: contract.name,
                  contractAddress: contract.address,
                  contractType: contract.schemaName,
                  contractChainId: contract.chainId,
                  contractTotalSupply: contract.totalSupply,
                  assetId: asset.id,
                  assetName: asset.name,
                  assetImageUrl: asset.imageUrl,
                  assetImagePreviewUrl: asset.imagePreviewUrl,
                  assetAnimationUrl: asset.animationUrl,
                  assetAnimationType: asset.animationType,
                  assetDescription: asset.description,
                  assetBackgroundColor: asset.backgroundColor,
                  assetExternalUrl: asset.externalUrl,
                  assetTraits: asset.traits,
                  assetXTraits: asset.Xtraits,
                  assetTokenUri: asset.tokenUri,
                  assetImageData: asset.imageData,
                  assetTokenId: asset.tokenId,
                  assetTotalOwners: asset.totalOwners,
                  assetTotalAmount: asset.totalAmount,
                  assetLikesCount: extra.likeCount,
                  assetViewCount: extra.viewCount,
                  assetRarityRanking: extra.rarityRanking,
                  collectionId: collection?.id,
                  collectionChainShortName: collection?.chainShortName,
                  collectionSlug: collection?.slug,
                  collectionName: collection?.name,
                  collectionContractAddress: collection?.contractAddress,
                  collectionServiceFee: collection?.serviceFee,
                  collectionCreatorFee: collection?.creatorFee,
                  collectionCreatorFeeAddress: collection?.creatorFeeAddress,
                  collectionIsCreatorFee: collection?.isCreatorFee,
                  collectionOwnerAddress: collection?.ownerAddress,
                  collectionLogoImageUrl: collection?.logoImageUrl,
                  collectionExternalLinks: collection?.externalLinks,
                  collectionIsVerified: collection?.isVerified,
                  collectionIsGoldVerified: collection?.isGoldVerified,
                  collectionIsCampaign202408Featured:
                    collection?.isCampaign202408Featured,
                  collectionCanNativeTrade: collection?.canNativeTrade,
                  collectionAllowCurrencies: allowCurrencies,
                  order: order,
                  collectionFloorPrice: extra.collectionFloorPrice,
                };
              })
              .filter((item) => item !== null)
          : [],
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}

@Injectable()
export class NewAssetSimpleList implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<AssetListResponse> {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        queueStatus: data?.queueStatus,
        items: data.rows
          ? data.rows.map((extra) => {
              const asset = extra.Asset;
              const contract = extra.Contract;

              return {
                contractAddress: contract.address,
                contractType: contract.schemaName,
                contractChainId: contract.chainId,
                assetTokenId: asset.tokenId,
              };
            })
          : [],
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}

@Injectable()
export class AssetInfo implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<AssetResponse> {
    return next.handle().pipe(
      map((data) => ({
        contractId: data.Contract?.id,
        contractName: data.Contract?.name,
        contractAddress: data.Contract?.address,
        contractType: data.Contract?.schemaName,
        contractTotalSupply: data.Contract?.totalSupply,
        assetId: data.id,
        assetName: data.name,
        assetImageUrl: data.imageUrl,
        assetImagePreviewUrl: data.imagePreviewUrl,
        assetAnimationUrl: data.animationUrl,
        assetAnimationType: data.animationType,
        assetDescription: data.description,
        assetBackgroundColor: data.backgroundColor,
        assetExternalUrl: data.externalUrl,
        assetTraits: data.traits,
        assetXTraits: data.Xtraits,
        assetTokenUri: data.tokenUri,
        assetImageData: data.imageData,
        // assetImageData: 'TBD',
        assetTokenId: data.tokenId,
        assetTotalOwners: data.totalOwners,
        assetTotalAmount: data.totalAmount,
        assetLikesCount: data.likesCount,
        assetRarityRanking: data.rarityRanking,
        assetViewCount: data.viewCount,
        collectionId: data.Collection?.id,
        collectionChainShortName: data.Collection?.chainShortName,
        collectionSlug: data.Collection?.slug,
        collectionName: data.Collection?.name,
        collectionContractAddress: data.Collection?.contractAddress,
        collectionServiceFee: data.Collection?.serviceFee,
        collectionCreatorFee: data.Collection?.creatorFee,
        collectionCreatorFeeAddress: data.Collection?.creatorFeeAddress,
        collectionIsCreatorFee: data.Collection?.isCreatorFee,
        collectionOwnerAddress: data.collectionOwnerAddress,
        collectionIsVerified: data.Collection?.isVerified,
        collectionIsGoldVerified: data.Collection?.isGoldVerified,
        collectionIsCampaign202408Featured:
          data.Collection?.isCampaign202408Featured,
        collectionCanNativeTrade: data.Collection?.canNativeTrade,
        collectionAllowCurrencies: data.allowCurrencies,
        owners: data.AssetAsEthAccount?.map((owner) => {
          return {
            username: owner.Wallet?.Account?.username,
            avatarUrl: owner.Wallet?.Account?.avatarUrl,
            ownerAddress: owner.ownerAddress,
            quantity: owner.quantity,
            updatedAt: owner.updatedAt,
          };
        }),
      })),
    );
  }
}
