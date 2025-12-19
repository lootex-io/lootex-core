import { LibsService } from '@/common/libs/libs.service';
import { OrderService } from '@/api/v3/order/order.service';
import {
  Controller,
  Get,
  Put,
  HttpException,
  Query,
  Body,
  Param,
  UseInterceptors,
  Post,
  UploadedFile,
  Logger,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';

import {
  UploadFile,
  CollectionInfo,
  CollectionList,
  ContractCacheFormat,
  CollectionOwnerAddress,
  CollectionFindResponse,
} from '@/api/v3/collection/collection.interface';
import {
  CollectionCreateDTO,
  CollectionParamsDTO,
  CollectionAssetsDTO,
  CollectionUpdateDTO,
  CollectionListQueryDTO,
  CollectionsParamsDTO,
  GetTradingBoardDTO,
} from '@/api/v3/collection/collection.dto';
import {
  CollectionListInterceptor,
  TradingBoardListInterceptor,
} from '@/api/v3/collection/collection.interceptor';
import { AssetListResponse } from '@/api/v3/asset/asset.interface';
import { AssetList } from '@/api/v3/asset/asset.interceptor';
import { CollectionService } from '@/api/v3/collection/collection.service';
import {
  AuthJwtGuard,
  AuthJwtGuardOptional,
} from '@/api/v3/auth/auth.jwt.guard';
import { CurrentUser, CurrentWallet } from '@/api/v3/auth/auth.decorator';
import { Account, Wallet, Collection } from '@/model/entities';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { ChainId } from '@/common/utils/types';
import { keywordsBaseQueryDTO } from '../explore/explore.dto';
import { ContractService } from '@/api/v3/contract/contract.service';
import { CacheService } from '@/common/cache/cache.service';
import { ConfigService } from '@nestjs/config';
import {
  QUEUE_STATUS,
  CONTRACT_UPDATE_ASSETS_QUEUE,
  QUEUE_ENV,
} from '@/common/utils';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';

import { CollectionDao } from '@/core/dao/collection-dao';
// Roles removed

import { OrderDao } from '@/core/dao/order-dao';
import { CollectionProxyService } from '@/api/v3/collection/proxy/collection-proxy.service';
import { CollectionDataService } from '@/api/v3/collection/proxy/collection-data.service';

@ApiTags('Collection')
@ApiCookieAuth()
@Controller('api/v3')
export class CollectionController {
  private readonly logger = new Logger(CollectionController.name);

  constructor(
    private readonly collectionService: CollectionService,
    private readonly contractService: ContractService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly orderService: OrderService,
    private readonly libService: LibsService,
    private readonly collectionDao: CollectionDao,
    private readonly collectionProxyService: CollectionProxyService,
    private readonly collectionDataService: CollectionDataService,
    private readonly orderDao: OrderDao,
  ) { }

  // ------------------ Upload ------------------

  // uploads removed

  @Get('collections')
  @UseInterceptors(CollectionListInterceptor)
  @UseGuards(AuthJwtGuardOptional)
  async collectionList(
    @Query() query: CollectionListQueryDTO,
    @CurrentUser() user: Account,
  ): Promise<CollectionFindResponse> {
    try {
      const { rows: existCollections, count: existCollectionsTotal } =
        await this.collectionService.getCollectionsByQuery(query, user);
      return {
        rows: existCollections,
        count: existCollectionsTotal,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Post('collections')
  async createCollection(
    @Body() body: CollectionCreateDTO,
  ): Promise<CollectionInfo> {
    try {
      const collection = await this.collectionDao.findOrCreateCollection(body);
      /*
      this.collectionService.autoUpdateCollectionLogoImage(collection.id);
      this.collectionService.autoUpdateIsMintingTag(
        collection.contractAddress,
        collection.chainId.toString(),
      );
      */
      return collection;
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('collections/order/floor-price')
  async getCollectionOrderFloorPrice(
    @Query('contractAddress') contractAddress: string,
    @Query('chainId') chainId: ChainId,
  ) {
    try {
      const order = await this.orderDao.getCollectionBestListing(
        contractAddress,
        chainId,
      );

      if (!order) {
        return {
          contractAddress,
          chainId,
          floorPrice: 0,
        };
      }

      return {
        contractAddress,
        chainId,
        floorPrice: order.perPrice,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  // recordTradingBoard removed

  @UseGuards(AuthJwtGuard)
  @Put('collections/:slug')
  async updateCollection(
    @Param() params: CollectionParamsDTO,
    @Body() body: CollectionUpdateDTO,
    @CurrentUser() user: Account,
  ): Promise<CollectionInfo> {
    try {
      this.logger.debug(body);
      this.logger.debug(user);

      const existCollection: Collection =
        await this.collectionService.getCollectionBySlug(params.slug);

      if (!existCollection) {
        throw new HttpException('collection not found', HttpStatus.BAD_REQUEST);
      }

      /* Role check removed (admin only logic removed or simplified)
       if (
        (await this.collectionService.isAccountIsCollectionOwner(
          user.id,
          existCollection.id,
        )) === false
      ) {
         throw new HttpException(
          'you are not contract owner',
          HttpStatus.BAD_REQUEST,
        );
      }
      */
      if (
        (await this.collectionService.isAccountIsCollectionOwner(
          user.id,
          existCollection.id,
        )) === false
      ) {
        throw new HttpException(
          'you are not contract owner',
          HttpStatus.BAD_REQUEST,
        );
      }

      // UGC cannot use externalLinks
      if (
        body.bannerImageUrl &&
        !body.bannerImageUrl.startsWith(
          'https://lootex-dev.s3.us-east-1.amazonaws.com/',
        )
      ) {
        throw new HttpException('invalid banner url', 400);
      }
      if (
        body.logoImageUrl &&
        !body.logoImageUrl.startsWith(
          'https://lootex-dev.s3.us-east-1.amazonaws.com/',
        )
      ) {
        throw new HttpException('invalid logo url', 400);
      }
      if (
        body.featuredImageUrl &&
        !body.featuredImageUrl.startsWith(
          'https://lootex-dev.s3.us-east-1.amazonaws.com/',
        )
      ) {
        throw new HttpException('invalid featured url', 400);
      }

      existCollection.set('chainShortName', body.chainShortName);
      existCollection.set('chainId', body.chainId);
      existCollection.set('contractAddress', body.contractAddress);
      existCollection.set('bannerImageUrl', body.bannerImageUrl);
      existCollection.set('logoImageUrl', body.logoImageUrl);
      existCollection.set('featuredImageUrl', body.featuredImageUrl);
      existCollection.set('featuredVideoUrl', body.featuredVideoUrl);
      existCollection.set('name', body.name);
      existCollection.set(
        'slug',
        existCollection.ownerAccountId ? existCollection.slug : body.slug,
      );
      existCollection.set('description', body.description);
      existCollection.set(
        'externalLinks',
        body.externalLinks ? body.externalLinks : [],
      );
      existCollection.set('isSensitive', body.isSensitive);
      existCollection.set('serviceFee', body.serviceFee);
      existCollection.set('officialAddress', body.officialAddress);

      if (body.creatorFee > 10) {
        throw new HttpException('creatorFee must be less than 10', 400);
      }
      if (!existCollection.isGoldVerified && body.creatorFee > 0.5) {
        throw new HttpException(
          'creatorFee must be less than 0.5 for non-gold verified collection',
          400,
        );
      }
      existCollection.set('isCreatorFee', body.isCreatorFee);
      existCollection.set('creatorFee', body.creatorFee);
      existCollection.set('creatorFeeAddress', body.creatorFeeAddress);

      await existCollection.save();

      const collection = await this.collectionService.getCollectionBySlug(
        params.slug,
      );
      return collection;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  // updateCollectionIsVerified removed

  @UseGuards(AuthJwtGuard)
  @Get('collections/me')
  async getMyCollections(
    @CurrentUser() user: Account,
  ): Promise<CollectionList> {
    try {
      const collections = await this.collectionService.myCollections(user.id);
      return {
        collections,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @UseGuards(AuthJwtGuard)
  @Get('collections/in-management')
  async getMyInManagementCollection(
    @CurrentUser() user: Account,
    @CurrentWallet() wallet: Wallet,
  ): Promise<CollectionList> {
    try {
      const collections = await this.collectionService.inManegementCollections(
        wallet.address,
      );
      return {
        collections,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('collections/personal')
  @UseInterceptors(CollectionListInterceptor)
  @UseGuards(AuthJwtGuardOptional)
  async getPersonalCollections(
    @Query() query: keywordsBaseQueryDTO,
    @CurrentUser() user: Account,
  ) {
    return await this.collectionService.exploreCollectionsByOpts(query, user);
  }

  @Get('collections/by-collection-slugs')
  @UseGuards(AuthJwtGuardOptional)
  async getCollectionsPreviewInfo(
    @Query() query: CollectionsParamsDTO,
    @CurrentUser() user: Account,
  ): Promise<CollectionInfo[]> {
    return this.collectionService.getCollectionPreviewInfo(query.slugs, user);
  }



  @Get('/collections/trading-board')
  @UseInterceptors(TradingBoardListInterceptor)
  @Cacheable({ key: 'collections:trading-board' })
  async getTradingBoard(@Query() query: GetTradingBoardDTO) {
    if (query.isAllCollection) {
      return await this.collectionService.getTradingBoardAllCollection({
        limit: query.limit,
        page: query.page,
        chainId: query.chainId,
        timeRange: query.timeRange,
      });
    } else {
      return await this.collectionService.getTradingBoard({
        limit: query.limit,
        page: query.page,
        chainId: query.chainId,
        timeRange: query.timeRange,
      });
    }
  }

  // syncCollectionStats removed

  //

  @Get('collections/:slug')
  // @Cacheable({ seconds: 5 })
  getCollectionInfo(@Param() params: CollectionParamsDTO) {
    // return this.collectionDataService.getCollectionInfo(params);
    return this.collectionProxyService.getCollectionInfo(params);
  }

  @Get('collections/:slug/simple')
  @Cacheable({ key: 'collections:info:simple' })
  async getCollectionSimpleInfo(
    @Param() params: CollectionParamsDTO,
  ): Promise<CollectionInfo> {
    try {
      this.logger.debug(params.slug);
      const collection = await this.collectionService.getCollectionSimpleBySlug(
        params.slug,
      );

      if (!collection) {
        throw new HttpException('collection not found', HttpStatus.BAD_REQUEST);
      }
      return collection;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  @Get('collections/:slug/all-assets')
  @UseInterceptors(AssetList)
  async getCollectionAssets(
    @Param() params: CollectionParamsDTO,
    @Query() query: CollectionAssetsDTO,
  ): Promise<AssetListResponse> {
    try {
      const collection: Collection =
        await this.collectionService.getCollectionBySlug(params.slug);

      if (!collection) {
        throw new HttpException('collection not found', HttpStatus.BAD_REQUEST);
      }

      // get your update assets queue in cache
      const queueKey = `${CONTRACT_UPDATE_ASSETS_QUEUE}-${collection.contractAddress}-${query.chainId}`;
      const cacheData: ContractCacheFormat =
        await this.cacheService.getCache(queueKey);
      const queueStatus = cacheData?.queueStatus || QUEUE_STATUS.PENDING;

      const { rows: existAssets, count: existAssetsTotal } =
        await this.collectionService.getCollectionAssetsBySlug(
          params.slug,
          query.chainId,
          query.limit,
          query.page,
        );

      if (cacheData) {
        return {
          queueStatus,
          rows: existAssets,
          count: existAssetsTotal,
        };
      }

      // Queue push removed
      // await this.queueService.sendMessageToSqs(...)

      return {
        queueStatus,
        rows: existAssets,
        count: existAssetsTotal,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('collections/:slug/owner')
  async getCollectionOwner(
    @Param() params: CollectionParamsDTO,
  ): Promise<CollectionOwnerAddress> {
    try {
      const ownerAddress =
        await this.collectionService.getCollectionContractOwnerAddress(
          params.slug,
        );
      return {
        ownerAddress,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  // updateCollectionTraits removed

  @Get('/collections/:slug/drop')
  @Cacheable({ key: 'collections:drop-info', seconds: 15 })
  async getDropInfo(
    @Param('slug') slug: string,
    @Query('tokenId') tokenId?: string,
  ) {
    return await this.collectionService.getDropInfo(slug, tokenId);
  }
}
