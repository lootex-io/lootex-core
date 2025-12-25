// QueueService removed
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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { UploadFile } from '@/api/v3/account/account.interface';
import { AuthJwtGuard } from '@/api/v3/auth/auth.jwt.guard';
import { CurrentUser } from '@/api/v3/auth/auth.decorator';
import { Account } from '@/model/entities';
import {
  UpdateAccountDTO,
  GetAccountsQueryDTO,
  GetAccountQueryDTO,
  UserAccountDTO,
  ChangeChainStatsVisibilityDto,
  SyncChainStatsTaskDto,
} from '@/api/v3/account/account.dto';
import { GetAccountsResponse } from '@/api/v3/account/account.interface';
// StorageService removed
import { AccountInterceptor, AccountPrivateInterceptor, OwnerList } from './account.interceptor';

import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { SimpleException } from '@/common/utils/simple.util';
// Roles removed

@ApiTags('Account')
@ApiCookieAuth()
@Controller('api/v3')
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(
    private readonly accountService: AccountService,
  ) {}

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

  // TODO: Will be removed
  // get asset owners list
  @Get('accounts/list/by-asset')
  @UseInterceptors(OwnerList)
  async getAssetOwners(
    @Query() query: GetAccountsQueryDTO,
  ): Promise<GetAccountsResponse> {
    try {
      const { accounts, count } = await this.accountService.getOwners(query);

      return {
        accounts,
        count,
      };
    } catch (err) {
      throw new HttpException(err.message, 400);
    }
  }

}
