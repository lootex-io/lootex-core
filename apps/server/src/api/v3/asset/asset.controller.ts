import {
  Controller,
  Get,
  Post,
  HttpException,
  Query,
  Param,
  UseInterceptors,
  UseGuards,
  Logger,
  Put,
  Ip,
} from '@nestjs/common';

import { AssetService } from '@/api/v3/asset/asset.service';
import { CacheService } from '@/common/cache/cache.service';
// import { QueueService } from '@/common/queue/queue.service';

import { LibsService } from '@/common/libs/libs.service';
import { ConfigService } from '@nestjs/config';
import {
  AuthJwtGuard,
  AuthJwtGuardOptional,
} from '@/api/v3/auth/auth.jwt.guard';
import { CurrentUser, CurrentWallet } from '@/api/v3/auth/auth.decorator';

import {
  QUEUE_STATUS,
  OWNER_UPDATE_ASSETS_QUEUE,
  ASSET_UPDATE_METADATA_QUEUE_PREFIX,
  QUEUE_ENV,
  CONTRACT_UPDATE_ASSETS_QUEUE,
  MAIN_CHAIN_IDS,
} from '@/common/utils';

import { Account, Wallet } from '@/model/entities';

import {
  AssetUpdateQueue,
  AssetListResponse,
  AssetMetadataUpdateQueue,
} from '@/api/v3/asset/asset.interface';

import { ContractCacheFormat } from '@/api/v3/collection/collection.interface';

import {
  AssetListQueryDTO,
  AssetMeQueryDTO,
  AssetParamsDTO,
  AssetChainFamilyParamsDTO,
  SyncAssetsByContractParamsDTO,
  AssetMetaDataUpdateQueryDTO,
  GetAssetsByUsernameParamsDTO,
  GetAssetsByUsernameQueryDTO,
  AssetUserHoldingQueryDTO,
  AssetCountDTO,
  SyncCollectionDTO,
} from '@/api/v3/asset/asset.dto';
import { AssetList, AssetInfo } from '@/api/v3/asset/asset.interceptor';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/sequelize';
import { ChainId } from '@/common/utils/types';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { AssetDao } from '@/core/dao/asset-dao';
import { AssetExtraService } from './asset-extra.service';
import { AssetProxyService } from '@/api/v3/asset/proxy/asset-proxy.service';
import { ContractService } from '../contract/contract.service';

@ApiTags('Asset')
@ApiCookieAuth()
@Controller('api/v3')
export class AssetController {
  private readonly logger = new Logger(AssetController.name);
  constructor(
    @InjectModel(Account)
    private accountRepository: typeof Account,
    private readonly cacheService: CacheService,
    private readonly assetService: AssetService,
    private readonly assetProxyService: AssetProxyService,
    private readonly assetExtraService: AssetExtraService,
    private readonly contractService: ContractService,

    private readonly configService: ConfigService,
    private readonly libsService: LibsService,
    private readonly assetDao: AssetDao,
  ) {}

  @Get('assets/test/:chainId/:contractAddress/:tokenId')
  async test(
    @Param('chainId') chainId: ChainId,
    @Param('contractAddress') contractAddress: string,
    @Param('tokenId') tokenId: string,
  ) {
    return await this.assetService.test(chainId, contractAddress, tokenId);
  }

  @Get('assets')
  @UseInterceptors(AssetList)
  async getAssets(
    @Query() query: AssetListQueryDTO,
  ): Promise<AssetListResponse> {
    try {
      const traitsKey = query.traits
        ? query.traits
            .map((trait) => `${trait.traitType}:${trait.value}`)
            .join('&')
        : '';

      // get your update assets queue in cache
      const queueKey = `${OWNER_UPDATE_ASSETS_QUEUE}-${
        query.ownerAddress
          ? query.ownerAddress.toLowerCase()
          : query.ownerAddress
      }-${traitsKey ? traitsKey + '-' : ''}${query.chainId}`;
      const assetUpdateQueue: AssetUpdateQueue =
        await this.cacheService.getCache(queueKey);
      let queueStatus = assetUpdateQueue?.queueStatus || QUEUE_STATUS.CONFIRM;

      // get assets from database
      const { rows: existAssets, count: existAssetsTotal } =
        await this.assetService.find(query);

      // publish to queue
      if (
        !assetUpdateQueue &&
        query.chainId &&
        query.ownerAddress &&
        !query.collectionSlug
      ) {
        queueStatus = QUEUE_STATUS.PENDING;
        // Queue removed
        /*
        await this.queueService.sendMessageToSqs(
          this.configService.get('AWS_SQS_OWNER_ASSETS_URL'),
          {
            ownerAddress: query.ownerAddress,
            chainId: query.chainId,
          },
        );
        */

        await this.cacheService.setCache(
          queueKey,
          {
            queueStatus,
            ownerAddress: query.ownerAddress,
            chainId: query.chainId,
          },
          this.configService.get(QUEUE_ENV.QUEUE_OWNER_ASSETS_EXPIRED),
        );
      }

      // TODO: check owner assets exist or not

      // just return raw data, and response interceptor will handle it
      return {
        queueStatus,
        rows: existAssets,
        count: existAssetsTotal,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  /**
   * 更新資料庫
   * @param user
   * @param dto
   * @returns
   */
  @UseGuards(AuthJwtGuard)
  @Get('assets/syncCollection')
  async syncCollection(
    @CurrentUser() user: Account,
    @Query() dto: SyncCollectionDTO,
  ) {
    return this.assetService.syncCollection(user, dto);
  }

  @UseGuards(AuthJwtGuard)
  @Get('assets/fetch')
  async fetchAssets(@CurrentUser() user: Account) {
    try {
      const account = await this.accountRepository.findOne({
        where: {
          username: user.username,
        },
        include: [
          {
            model: Wallet,
          },
        ],
      });

      if (!account) {
        throw new HttpException('account not found', 404);
      }

      await Promise.all(
        account.wallets.map(async (wallet) => {
          await Promise.all(
            MAIN_CHAIN_IDS.map(async (chainId) => {
              // get your update assets queue in cache
              const queueKey = `${OWNER_UPDATE_ASSETS_QUEUE}-${wallet.address.toLowerCase()}-${chainId}`;
              const assetUpdateQueue: AssetUpdateQueue =
                await this.cacheService.getCache(queueKey);
              const queueStatus =
                assetUpdateQueue?.queueStatus || QUEUE_STATUS.PENDING;

              // Queue removed
              /*
              await this.queueService.sendMessageToSqs( ... )
              */

              await this.cacheService.setCache(
                queueKey,
                {
                  queueStatus,
                  ownerAddress: wallet.address,
                  chainId: chainId,
                },
                this.configService.get(QUEUE_ENV.QUEUE_OWNER_ASSETS_EXPIRED),
              );
            }),
          );
        }),
      );

      const queueStatus = await Promise.all(
        account.wallets.map(async (wallet) => {
          return Promise.all(
            MAIN_CHAIN_IDS.map(async (chainId) => {
              return await this.cacheService.getCache(
                `${OWNER_UPDATE_ASSETS_QUEUE}-${wallet.address.toLowerCase()}-${chainId}`,
              );
            }),
          );
        }),
      );

      return queueStatus;
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Put('assets/fetch')
  @Cacheable({ key: 'asset:fetch:holding', seconds: 300 })
  async fetchHoldingAssets(
    @Query('walletAddress') walletAddress: string,
    @Query('chainId') chainId: ChainId,
  ) {
    await this.assetService.updateAssetsByQueue({
      ownerAddress: walletAddress,
      chainId: chainId,
    });
  }

  // TODO: remove this api
  @UseGuards(AuthJwtGuard)
  @Get('assets/me')
  @UseInterceptors(AssetList)
  async myAssets(
    @Query() query: AssetMeQueryDTO,
    @CurrentUser() user: Account,
    @CurrentWallet() wallet: Wallet,
  ): Promise<AssetListResponse> {
    try {
      // get your update assets queue in cache
      const queueKey = `${OWNER_UPDATE_ASSETS_QUEUE}-${wallet.address.toLowerCase()}-${
        query.chainId
      }`;
      const assetUpdateQueue: AssetUpdateQueue =
        await this.cacheService.getCache(queueKey);
      const queueStatus = assetUpdateQueue?.queueStatus || QUEUE_STATUS.PENDING;

      // get assets from database
      const { rows: existAssets, count: existAssetsTotal } =
        await this.assetService.find({
          ownerAddress: wallet.address.toLocaleLowerCase(),
          chainId: query.chainId,
          limit: query.limit,
          page: query.page,
        });

      // publish to queue
      if (!assetUpdateQueue) {
        // await this.queueService.publish(QUEUE_OWNER_ASSET_NAME, {
        //   ownerAddress: wallet.address,
        //   chainId: query.chainId,
        // });
        // Queue removed
        /*
        await this.queueService.sendMessageToSqs( ... )
        */

        await this.cacheService.setCache(
          queueKey,
          {
            queueStatus,
            ownerAddress: wallet.address,
            chainId: query.chainId,
          },
          this.configService.get(QUEUE_ENV.QUEUE_OWNER_ASSETS_EXPIRED),
        );
      }

      // just return raw data, and response interceptor will handle it
      return {
        queueStatus,
        rows: existAssets,
        count: existAssetsTotal,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('/assets/count')
  async getAssetCount(@Query() query: AssetCountDTO) {
    try {
      return this.assetService.getAssetCount(query);
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('assets/:id')
  @UseInterceptors(AssetInfo)
  async getAsset(@Param() params: AssetParamsDTO): Promise<any> {
    try {
      this.logger.debug(params.id);
      const asset = await this.assetService.findById(params.id);
      return asset;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  @Get('assets/username/:username')
  @UseInterceptors(AssetList)
  async getAssetsByUsername(
    @Param() params: GetAssetsByUsernameParamsDTO,
    @Query() query: GetAssetsByUsernameQueryDTO,
  ): Promise<any> {
    try {
      const { rows, count } = await this.assetService.getAssetsByUsername(
        params.username,
        query.chainId,
        query.limit,
        query.page,
      );
      return {
        rows,
        count,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  // 取得 or 更新 contract 所有 assets
  @Post('assets/:chainShortName/:contractAddress/sync')
  async syncContractAssets(
    @Param() params: SyncAssetsByContractParamsDTO,
  ): Promise<void> {
    try {
      const chainId = (await this.libsService.findChainIdByChainShortName(
        params.chainShortName,
      )) as any;
      return await this.contractService.updateAssetsByQueue({
        contractAddress: params.contractAddress,
        chainId,
      });
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  // 強制更新 token metadata
  @Post('assets/:chainShortName/:contractAddress/:tokenId/sync')
  @UseInterceptors(AssetInfo)
  async syncAsset(@Param() params: AssetChainFamilyParamsDTO): Promise<void> {
    try {
      const chainId = await this.libsService.findChainIdByChainShortName(
        params.chainShortName,
      );
      // get new asset or update asset into db
      await this.assetDao.syncAssetOnChain({
        contractAddress: params.contractAddress,
        chainId: chainId as any,
        tokenId: params.tokenId,
      });
      await this.assetService.updateAssetTotalOwners(
        params.contractAddress,
        params.tokenId,
        chainId as any,
      );
      // get asset
      const asset = await this.assetService.getAssetDetailInfo(params);

      return asset;
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      } else {
        throw new HttpException(err.message, 400);
      }
    }
  }

  @Get('assets/:chainShortName/:contractAddress/:tokenId')
  @UseInterceptors(AssetInfo)
  @UseGuards(AuthJwtGuardOptional)
  // @Cacheable({ seconds: 5 })
  async getAssetByParams(
    @Param() params: AssetChainFamilyParamsDTO,
    @CurrentUser() user: Account,
  ): Promise<any> {
    // const asset = await this.assetService.getAssetDetailInfo(params);
    const asset = await this.assetProxyService.getAssetInfo(params);

    return asset;
  }

  @Get('assets/sync')
  async updateAssetsMetadata(@Query() query: AssetMetaDataUpdateQueryDTO) {
    try {
      // get your update assets queue in cache
      const queueKey = `${ASSET_UPDATE_METADATA_QUEUE_PREFIX}-${query.contractAddress}-${query.tokenId}-${query.chainId}`;
      const cacheData: AssetMetadataUpdateQueue | null | undefined =
        await this.cacheService.getCache(queueKey);
      let queueStatus = cacheData?.queueStatus || QUEUE_STATUS.PENDING;

      if (!cacheData) {
        queueStatus = QUEUE_STATUS.PENDING;

        // Queue removed
        /*
        await this.queueService.sendMessageToSqs(
          this.configService.get('AWS_SQS_ASSET_METADATA_URL'),
          {
            contractAddress: query.contractAddress,
            tokenId: query.tokenId,
            chainId: query.chainId,
          },
        );
        */
        await this.cacheService.setCache(
          queueKey,
          {
            queueStatus,
            contractAddress: query.contractAddress,
            tokenId: query.tokenId,
            chainId: query.chainId,
          },
          this.configService.get(QUEUE_ENV.QUEUE_OWNER_ASSETS_EXPIRED),
        );
      }

      return {
        queueStatus,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Put('assets/user/holding')
  @Cacheable({ key: 'asset:user:hold:sync', seconds: 30 })
  async syncAssetUserHolding(@Query() query: AssetUserHoldingQueryDTO) {
    try {
      return await this.assetService.syncAssetUserHolding(query);
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('assets/user/holding')
  async getAssetUserHolding(@Query() query: AssetUserHoldingQueryDTO) {
    try {
      return await this.assetService.getAssetUserHolding(query);
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }
}
