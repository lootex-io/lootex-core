import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CollectionService } from '@/api/v3/collection/collection.service';
import { StorageService } from '@/external/storage/storage.service';
import { ContractService } from '@/api/v3/contract/contract.service';
import { CacheService } from '@/common/cache';
import { QueueService } from '@/external/queue/queue.service';
import { ConfigService } from '@nestjs/config';
import { OrderService } from '@/api/v3/order/order.service';
import { LibsService } from '@/common/libs/libs.service';
import { CollectionDao } from '@/core/dao/collection-dao';
import { OrderDao } from '@/core/dao/order-dao';

import { StudioService } from '@/api/v3/studio/studio.service';
import { CollectionParamsDTO } from '@/api/v3/collection/collection.dto';
import * as promise from 'bluebird';
import { ChainId } from '@/common/utils/types';
import { InjectModel } from '@nestjs/sequelize';
import { CollectionTradingBoardOneDay } from '@/model/entities';

@Injectable()
export class CollectionDataService {
  private readonly logger = new Logger(CollectionDataService.name);
  constructor(
    @InjectModel(CollectionTradingBoardOneDay)
    private collectionTradingBoardOneDayRepository: typeof CollectionTradingBoardOneDay,
    private readonly collectionService: CollectionService,
    private readonly storageService: StorageService,
    private readonly contractService: ContractService,
    private readonly cacheService: CacheService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
    private readonly orderService: OrderService,
    private readonly libService: LibsService,
    private readonly collectionDao: CollectionDao,
    private readonly orderDao: OrderDao,

    private readonly studioService: StudioService,
  ) {}

  async getCollectionInfo(params: CollectionParamsDTO) {
    try {
      this.logger.debug(params.slug);
      const start = Date.now();
      const collection = await this.collectionService.getCollectionBySlug(
        params.slug,
      );
      if (!collection) {
        throw new HttpException('collection not found', HttpStatus.BAD_REQUEST);
      }

      const [
        randomAssets,
        ownerAddress,
        orderStatistic,
        priceSymbol,
        totalOwners,
        totalItems,
        totalVolume,
        totalTradingCount,
        contractType,
        bestCollectionOffer,

        listingPercents,
        oneDayTradingVolume,
        allowCurrencies,
        bestListing,
      ] = await promise.all([
        this.collectionService.getRandomAssets(collection.id),
        collection.ownerAddress,
        // this.collectionService.getCollectionContractOwnerAddress(params.slug),
        this.collectionDao.getCollectionOrderStatistic(
          collection.contractAddress,
          collection.chainId.toString(),
        ),
        this.collectionService.getCollectionPriceSymbol(collection.id),
        this.collectionService.getCacheTotalOwnersByCollectionId(
          collection.id,
          false, // Use cache instead of forcing update on every page view
        ),
        this.collectionService.getCacheTotalItemsByCollectionId(collection.id),
        this.collectionService.totalVolume(collection.id),
        this.collectionService.totalTradingCount(collection.id),
        this.contractService.getContractType(
          collection.chainId.toString() as ChainId,
          collection.contractAddress,
        ),
        this.orderService.getBestCollectionOffer(collection.slug),

        this.collectionService.getCollectionListingPercents(collection.id),
        this.getCollectionOneDayVolume(
          collection.chainId,
          collection.contractAddress,
        ),
        this.collectionDao.getAllowCurrenciesByCollectionId(collection.id),
        this.collectionService.getCollectionBestListingFromCache(
          collection.contractAddress,
          collection.chainId.toString(),
        ),
      ]);

      // auto update collection logo image
      this.collectionService.autoUpdateCollectionLogoImage(collection.id);
      this.orderService.updateCollectionBestListingToCache(
        collection.contractAddress,
        collection.chainId.toString(),
        {
          force: true,
        },
      );
      this.orderService.updateCollectionBestOfferToCache(
        collection.contractAddress,
        collection.chainId.toString(),
        {
          force: true,
        },
      );
      this.orderService.getBestCollectionOffer(collection.slug, true);

      // Start running
      this.collectionService.syncOpenSeaCollectionListings(params.slug);
      // End running

      this.studioService
        .getContractByChainIdAndAddress(
          collection.chainId.toString(),
          collection.contractAddress,
        )
        .then((contract) => {
          this.studioService.updateStudioContractEndSale(contract);
        });
      this.collectionService.autoUpdateIsMintingTag(
        collection.contractAddress,
        collection.chainId.toString(),
      );

      return {
        id: collection.id,
        chainId: collection.chainId.toString(),
        chainShortName: collection.chainShortName,
        priceSymbol,
        contractAddress: collection.contractAddress,
        contractType: contractType,
        bannerImageUrl: collection.bannerImageUrl,
        logoImageUrl: collection.logoImageUrl,
        featuredImageUrl: collection.featuredImageUrl,
        featuredVideoUrl: collection.featuredVideoUrl,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        externalLinks: collection.externalLinks ? collection.externalLinks : [],
        isVerified: collection.isVerified,
        isGoldVerified: collection.isGoldVerified,
        isSensitive: collection.isSensitive,
        isMinting: collection.isMinting,
        isCampaign202408Featured: collection.isCampaign202408Featured,
        isDrop: collection.isDrop,
        isRarity: collection.isRarity,
        serviceFee: collection.serviceFee,
        creatorFee: collection.creatorFee,
        isCreatorFee: collection.isCreatorFee,
        creatorFeeAddress: collection.creatorFeeAddress,
        officialAddress: collection.officialAddress,

        canNativeTrade: collection.canNativeTrade,
        allowCurrencies,
        isRevealable: collection.isRevealable,
        canRevealAt: collection.canRevealAt,
        revealUrl: collection.revealUrl,
        isStakeable: collection.isStakeable,
        stakeUrl: collection.stakeUrl,
        isDiscordVerify: collection.isDiscordVerify,
        discordVerifyUrl: collection.discordVerifyUrl,
        isRedeemable: collection.isRedeemable,
        canRedeemAt: collection.canRedeemAt,
        redeemUrl: collection.redeemUrl,
        featured: randomAssets,
        listingPercents,
        floorPrice: orderStatistic.floorPrice,
        bestListing: bestListing,
        bestOffer: orderStatistic.bestOffer,
        currentListing: orderStatistic.currentListing,
        currentOffer: orderStatistic.currentOffer,
        totalListing: orderStatistic.totalListing,
        totalOffer: orderStatistic.totalOffer,
        oneDayTradingVolume: +oneDayTradingVolume,
        totalOwners,
        totalItems,
        totalVolume,
        totalTradingCount,
        ownerAddress,
        bestCollectionOffer,
      };
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  async getCollectionOneDayVolume(chainId: number, contractAddress: string) {
    const oneDay = await this.collectionTradingBoardOneDayRepository.findOne({
      where: { contractAddress: contractAddress, chainId: chainId },
    });
    return oneDay?.tradingVolume ?? 0;
  }
}
