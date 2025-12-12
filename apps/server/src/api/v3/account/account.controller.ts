// QueueService removed
import { CollectionService } from '@/api/v3/collection/collection.service';
import { AssetService } from '@/api/v3/asset/asset.service';
import { CacheService } from '@/common/cache';
import { ConfigService } from '@nestjs/config';
import {
  AccountService,
  ReturnAccount,
} from '@/api/v3/account/account.service';
import {
  Controller,
  Get,
  Put,
  Post,
  UseInterceptors,
  HttpException,
  UploadedFile,
  UseGuards,
  Body,
  Query,
  Logger,
  Param,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { UploadFile } from '@/api/v3/account/account.interface';
import {
  AuthJwtGuard,
  AuthJwtGuardOptional,
} from '@/api/v3/auth/auth.jwt.guard';
import { CurrentUser, FlexCookieOption } from '@/api/v3/auth/auth.decorator';
import { Account } from '@/model/entities';
import {
  UpdateAccountDTO,
  GetAccountsQueryDTO,
  GetAccountQueryDTO,
  UserAccountDTO,
  GetAccountFollowDTO,
  UpdateFeaturedAssetsDTO,
  GetAccountReferralDTO,
  ChangeChainStatsVisibilityDto,
  SyncChainStatsTaskDto,
  AccountRenameDTO,
} from '@/api/v3/account/account.dto';
import { GetAccountsResponse } from '@/api/v3/account/account.interface';
// StorageService removed
import {
  AccountInterceptor,
  AccountList,
  AccountPrivateInterceptor,
  OwnerList,
  ReferralAccountList,
} from './account.interceptor';

import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
// Roles removed
import { AuthService } from '../auth/auth.service';
import { CFIp } from '@/common/decorator/cf-ip.decorator';
import { SimpleException } from '@/common/utils/simple.util';
import { CookieSerializeOptions } from 'cookie';
import { ResponseWithCookie } from '../auth/auth.interface';

@ApiTags('Account')
@ApiCookieAuth()
@Controller('api/v3')
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(
    private readonly accountService: AccountService,
    private readonly authService: AuthService,
    private readonly cacheService: CacheService,
    private readonly assetService: AssetService,
    private readonly collectionService: CollectionService,
    private readonly configService: ConfigService,
  ) { }

  // uploadAccountAvatar removed (S3 removal)

  @UseInterceptors(AccountPrivateInterceptor)
  @UseGuards(AuthJwtGuard)
  @Get('/accounts/profile')
  getProfile(@CurrentUser() user: Account): Promise<ReturnAccount> {
    return this.accountService.getProfile(user.username);
  }

  @UseInterceptors(AccountInterceptor)
  @Get('/accounts/:username')
  async getUserProfile(
    @Param() params: UserAccountDTO,
  ): Promise<ReturnAccount> {
    const query = new GetAccountQueryDTO();
    query.username = params.username;
    return this.accountService.getUserInfo(query);
  }

  @UseInterceptors(AccountInterceptor)
  @Get('/accounts')
  getUserInfo(@Query() query: GetAccountQueryDTO): Promise<ReturnAccount> {
    return this.accountService.getUserInfo(query);
  }

  @UseGuards(AuthJwtGuard)
  @Put('/accounts/profile')
  async updateProfile(
    @Body() body: UpdateAccountDTO,
    @CurrentUser() user: Account,
  ): Promise<void> {
    try {
      if (
        body.avatarUrl &&
        !body.avatarUrl.startsWith(
          'https://lootex-dev.s3.us-east-1.amazonaws.com/',
        )
      ) {
        throw new HttpException('invalid url', 400);
      }

      this.logger.debug(user);
      this.logger.debug(body);
      user.set('fullname', body.fullname ? body.fullname : user.fullname);
      user.set('avatarUrl', body.avatarUrl ? body.avatarUrl : user.avatarUrl);
      user.set(
        'introduction',
        body.introduction ? body.introduction : user.introduction,
      );
      user.set('externalLinks', body.externalLinks ? body.externalLinks : []);
      await user.save();
      return;
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  // rename
  @UseGuards(AuthJwtGuard)
  @Put('/accounts/username')
  async updateUsername(
    @Query() query: AccountRenameDTO,
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Res({ passthrough: true }) response: ResponseWithCookie,
    @CurrentUser() user: Account,
  ) {
    const renameLog = await this.accountService.updateAccountUsername(
      user.id,
      query.username,
    );

    const jwtToken = await this.authService.getJwtTokenByAccountId(
      renameLog.accountId,
    );

    response.cookie(
      this.configService.get('AUTH_JWT_COOKIE_KEY'),
      jwtToken,
      cookieOption,
    );

    return renameLog;
  }

  // TODO: Will be removed
  // get asset owners list
  @Get('accounts/list/by-asset')
  @UseInterceptors(OwnerList)
  async getAssetOwners(
    @Query() query: GetAccountsQueryDTO,
  ): Promise<GetAccountsResponse> {
    try {
      // get your update asset owners queue in cache
      // const queueKey = `${ASSET_UPDATE_OWNERS_QUEUE_PREFIX}-${query.contractAddress}-${query.tokenId}-${query.chainId}`;
      // const assetOwnersUpdateQueue: AssetOwnersUpdateQueue | null | undefined =
      //   await this.cacheService.getCache(queueKey);
      // const queueStatus =
      //   assetOwnersUpdateQueue?.queueStatus || QUEUE_STATUS.PENDING;

      // get asset owners from database
      const { accounts, count } = await this.accountService.getOwners(query);

      // publish to queue
      // if (!assetOwnersUpdateQueue) {
      //   // await this.queueService.publish(QUEUE_ASSET_OWNERS_NAME, {
      //   //   chainId: query.chainId,
      //   //   contractAddress: query.contractAddress,
      //   //   tokenId: query.tokenId,
      //   // });
      //   await this.queueService.sendMessageToSqs(
      //     this.configService.get('AWS_SQS_ASSET_OWNERS_URL'),
      //     {
      //       chainId: query.chainId,
      //       contractAddress: query.contractAddress,
      //       tokenId: query.tokenId,
      //     },
      //   );

      //   await this.cacheService.setCache(
      //     queueKey,
      //     {
      //       queueStatus,
      //       chainId: query.chainId,
      //       contractAddress: query.contractAddress,
      //       tokenId: query.tokenId,
      //     },
      //     this.configService.get(QUEUE_ENV.QUEUE_ASSET_OWNERS_EXPIRED),
      //   );
      // }

      // just return raw data, and response interceptor will handle it
      return {
        // queueStatus,
        accounts,
        count,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  // *---------------------* //
  // *  Like & Follow API  * //

  //account follow account
  @UseGuards(AuthJwtGuard)
  @Put('/accounts/follow/account/:username')
  async followAccount(
    @CurrentUser() user: Account,
    @Param('username') username: string,
  ): Promise<boolean> {
    const following = await this.accountService.getAccountByUsername(username);
    return await this.accountService.followAccount(user.id, following.id);
  }

  // get user following accounts
  @Get('/accounts/following/accounts')
  @UseInterceptors(AccountList)
  @UseGuards(AuthJwtGuardOptional)
  async getFollowingAccounts(
    @Query() query: GetAccountFollowDTO,
    @CurrentUser() user: Account,
  ) {
    try {
      const { accounts, count } = user
        ? await this.accountService.getUserFollowingAccountsByAccountId(
          query,
          user.id,
        )
        : await this.accountService.getUserFollowingAccounts(query);
      return {
        accounts,
        count,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  // get user follower accounts
  @Get('/accounts/follower/accounts')
  @UseInterceptors(AccountList)
  @UseGuards(AuthJwtGuardOptional)
  async getFollowerAccounts(
    @Query() query: GetAccountFollowDTO,
    @CurrentUser() user: Account,
  ) {
    try {
      const { accounts, count } = user
        ? await this.accountService.getUserFollowerAccountsByAccountId(
          query,
          user.id,
        )
        : await this.accountService.getUserFollowerAccounts(query);
      return {
        accounts,
        count,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  // get user isFollowing account?
  @UseGuards(AuthJwtGuard)
  @Get('/accounts/follow/account/:username')
  async isFollowingAccount(
    @CurrentUser() user: Account,
    @Param('username') username: string,
  ): Promise<boolean> {
    try {
      const following =
        await this.accountService.getAccountByUsername(username);
      return await this.accountService.isFollowingAccount(
        user.id,
        following.id,
      );
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Get('/accounts/featured/assets/:username')
  async getFeaturedAssets(@Param('username') username: string) {
    try {
      return this.accountService.getFeaturedAssets(username);
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @UseGuards(AuthJwtGuard)
  @Put('/accounts/featured/assets')
  async updateFeaturedAssets(
    @CurrentUser() user: Account,
    @Body() body: UpdateFeaturedAssetsDTO,
  ) {
    try {
      return this.accountService.updateFeaturedAssets(
        user.id,
        body.featuredSections,
      );
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

  @Put('/accounts/featured/assets/sync/:username')
  async syncFeaturedAssets(@Param('username') username: string) {
    try {
      return this.accountService.syncFeaturedAssets(username);
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }
}
