import { Promise } from 'bluebird';
import { CookieSerializeOptions } from 'cookie';
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpException,
  Headers,
  Res,
  UseGuards,
  Delete,
  HttpStatus,
  Param,
  Put,
  Logger,
  Ip,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigurationService } from '@/configuration/configuration.service';
import {
  ResponseWithCookie,
  LootexJwtPayload,
  AuthSignUpResult,
  AuthGetAccountInfoResult,
  AuthGetChallengeResult,
  AuthSupportedWalletProviderEnum,
  AuthSupportedWalletTransport,
  AuthSupportedChainFamily,
  SocialPlatform,
} from '@/api/v3/auth/auth.interface';
import {
  GetChallengeDto,
  AccountAuthBaseDto,
  AccountSignUpDto,
  IsWalletBoundDto,
  QueryByUsernameBaseDto,
  QueryByAddressBaseDto,
  AccountTorusSignUpDto,
  AccountTorusNewWalletSignUpDto, // leaving this if potentially used, but likely to remove
  SocialConnectDTO,
  AccountPrivySignUpDto,
  GetChallengePlusDto,
  VerifyChallengePlusDto,
} from '@/api/v3/auth/auth.dto';
import { AuthService } from './auth.service';
import {
  AUTH_COOKIE_EXPIRE_DATE,
  WEB3_SUPPORTED_CHAIN_FAMILIES,
  DEV_ENVIRONMENT_HOST_REGEX,
} from '@/common/utils/constants';
import { AuthJwtGuard } from './auth.jwt.guard';
import { Account, AccountSocialToken, Wallet } from '@/model/entities';
import { CurrentUser, CurrentWallet, FlexCookieOption } from './auth.decorator';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { CacheService } from '@/common/cache';
import axios from 'axios';
import { randomBytes, createHash } from 'crypto';
import { stringify } from 'querystring';
import { Response } from 'express';
import { InjectModel } from '@nestjs/sequelize';
import { AuthGuard } from '@nestjs/passport';
import { AccountService } from '../account/account.service';
import { RealIP } from 'nestjs-real-ip';
import { CFIp, CFIpCountry } from '@/common/decorator/cf-ip.decorator';
import { AccountPrivateInterceptor } from '../account/account.interceptor';
import { LoginPayload } from 'thirdweb/auth';

@ApiTags('Auth')
@ApiCookieAuth()
@Controller('api/v3/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    @InjectModel(Account)
    private readonly accountRepository: typeof Account,
    @InjectModel(Wallet)
    private readonly walletsRepository: typeof Wallet,
    @InjectModel(AccountSocialToken)
    private readonly accountSocialTokenRepository: typeof AccountSocialToken,
    private readonly configurationService: ConfigurationService,
    private readonly accountService: AccountService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly httpService: HttpService,
    private readonly cacheService: CacheService,
  ) { }





  // sendEmailOTP removed

  // isEmailAvailable and isUsernameAvailable removed











  // isWalletBound removed

  // bindWalletAndSignIn removed

  // unbindWalletById removed



  // @dev Awaiting implementation after ABAC
  // @Put('/web3/accounts/update')
  // async updateAccount() {}

  // @dev Awaiting implementation after ABAC
  // @Get('/web3/accounts/retrieveById')
  // async retrieveAccountById() {}

  // @dev Awaiting implementation after ABAC
  // @Delete('/web3/accounts/deleteById')
  // async deleteAccountById() {}

  // @dev Awaiting implementation after ABAC
  // @Put('/web3/accounts/setMainWalletById')
  // async setAccountsMainWalletById() {}
}
