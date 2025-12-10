import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CollectionsApiResponse } from '@/api/v3/collection/collection.interface';

import { pagination, parseLimit } from '@/common/utils/pagination';

@Injectable()
export class CollectionListInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<CollectionsApiResponse> {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        collections: data.rows
          .filter((collection) => !!collection)
          .map((collection) => {
            let collectionVolume;
            if (collection.CollectionVolumeAllDays) {
              collectionVolume = collection.CollectionVolumeAllDays;
            } else if (collection.CollectionVolumeThirtyDays) {
              collectionVolume = collection.CollectionVolumeThirtyDays;
            } else if (collection.CollectionVolumeSevenDays) {
              collectionVolume = collection.CollectionVolumeSevenDays;
            } else if (collection.CollectionVolumeToday) {
              collectionVolume = collection.CollectionVolumeToday;
            } else {
              collectionVolume = null;
            }

            return {
              id: collection.id,
              ownerAccountId: collection.ownerAccountId,
              ownerAddress: collection.ownerAddress,
              chainShortName: collection.chainShortName,
              chainId: collection.chainId,
              contractAddress: collection.contractAddress,
              bannerImageUrl: collection.bannerImageUrl,
              logoImageUrl: collection.logoImageUrl,
              featuredImageUrl: collection.featuredImageUrl,
              name: collection.name,
              slug: collection.slug,
              description: collection.description,
              externalLinks: collection.externalLinks,
              isVerified: collection.isVerified,
              isSensitive: collection.isSensitive,
              isMinting: collection.isMinting,
              isCampaign202408Featured: collection.isCampaign202408Featured,
              serviceFee: collection.serviceFee,
              creatorFee: collection.creatorFee,
              isRarity: collection.isRarity,
              createdAt: collection.createdAt,
              updatedAt: collection.updatedAt,
              deletedAt: collection.deletedAt,
              isLike: collection.isLike,

              totalOwners: collection.totalOwners,
              totalItems: collection.totalItems,
              totalVolume:
                collectionVolume?.volume || collection?.totalVolume || 0,
              totalTradingCount: collectionVolume?.count || 0,
              featured: collection.randomAssets,
              floorPrice: collection?.floorPrice,
              orderInfo: collection?.orderInfo,
              priceSymbol: collection?.priceSymbol,
            };
          }),
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}

@Injectable()
export class TradingBoardListInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        tradingBoard: data.rows,
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}
