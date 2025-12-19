import {
  Controller,
  Get,
  Query,
  HttpException,
  Logger,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';

import {
  keywordsAssetsQueryDTO,
  keywordsBaseQueryDTO,
  collectionQueryDTO,
} from '@/api/v3/explore/explore.dto';
import { AssetService } from '@/api/v3/asset/asset.service';
import { AccountService } from '@/api/v3/account/account.service';
import { CollectionService } from '@/api/v3/collection/collection.service';
import {
  AssetList,
  NewAssetList,
  NewAssetSimpleList,
} from '@/api/v3/asset/asset.interceptor';
import { CollectionListInterceptor } from '@/api/v3/collection/collection.interceptor';
import { AccountList } from '../account/account.interceptor';
import { ExploreService } from '@/api/v3/explore/explore.service';

import { AuthJwtGuard, AuthJwtGuardOptional } from '../auth/auth.jwt.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { Account } from '@/model/entities';
import { Throttle } from '@nestjs/throttler';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { ExploreQuestService } from '@/api/v3/explore/explore-quest.service';
import { ExploreProxyService } from '@/api/v3/explore/proxy/explore-proxy.service';

@Controller('api/v3')
export class ExploreController {
  private readonly logger = new Logger(ExploreController.name);

  constructor(
    private readonly exploreService: ExploreService,
    private readonly exploreQuestService: ExploreQuestService,
    private readonly assetService: AssetService,
    private readonly exploreProxyService: ExploreProxyService,
    private readonly accountService: AccountService,
    private readonly collectionService: CollectionService,
  ) {}

  @Get('/explore/assets_old')
  @UseInterceptors(AssetList)
  async getAssets(@Query() query: keywordsAssetsQueryDTO) {
    try {
      this.logger.debug('exploreAssets');
      const { assets, count } =
        await this.assetService.exploreAssetsByOpts(query);
      return {
        rows: assets,
        count: count,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Throttle(50, 60)
  @Get('/explore/users')
  @UseInterceptors(AccountList)
  @UseGuards(AuthJwtGuardOptional)
  async getUsers(
    @CurrentUser() user: Account,
    @Query() query: keywordsBaseQueryDTO,
  ) {
    try {
      const { rows: accounts, count } = await this.exploreService.users(
        user,
        query,
      );
      return { accounts, count };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('/explore/collections')
  @UseGuards(AuthJwtGuardOptional)
  @UseInterceptors(CollectionListInterceptor)
  async getCollections(
    @Query() query: collectionQueryDTO,
    @CurrentUser() user: Account,
  ) {
    try {
      const collections = await this.exploreService.collections(query, user);
      return collections;
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('/explore/assets')
  @UseInterceptors(NewAssetList)
  @Cacheable({ key: 'explore:assets', seconds: 5 })
  async assets(@Query() query: keywordsAssetsQueryDTO) {
    return this.exploreProxyService.assets(query);
    // return this.exploreService.assets(query);
  }

  @Get('/explore/assets/test')
  @UseInterceptors(NewAssetList)
  @Cacheable({ key: 'explore:assets', seconds: 5 })
  async assetsTest(@Query() query: keywordsAssetsQueryDTO) {
    return this.exploreProxyService.assetsTest(query);
    // return this.exploreService.assets(query);
  }

  @Get('/explore/assets/simple')
  @UseInterceptors(NewAssetSimpleList)
  @Cacheable({ key: 'explore:assets:simple', seconds: 5 })
  async assetsSimple(@Query() query: keywordsAssetsQueryDTO) {
    try {
      return await this.exploreService.assetsSimple(query);
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('/explore/assets-by-daily')
  @UseGuards(AuthJwtGuard)
  @UseInterceptors(NewAssetList)
  async dailyAssets(@CurrentUser() user: Account) {
    try {
      return await this.exploreQuestService.dailyAssets(user.username);
      // return await this.exploreQuestService.dailyAssets('slider');
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }
}
