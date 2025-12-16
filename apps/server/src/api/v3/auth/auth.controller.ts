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



  // @dev getChallenge: generates a random one-time challenge for the user
  @Get('/challenge/get')
  async getChallenge(
    @Query() getChallengeDto: GetChallengeDto,
  ): Promise<AuthGetChallengeResult> {
    try {
      if (
        !WEB3_SUPPORTED_CHAIN_FAMILIES.includes(getChallengeDto.chainFamily)
      ) {
        throw new TypeError('getChallenge: Chain family not supported');
      }
      switch (getChallengeDto.chainFamily) {
        case 'ETH':
        case 'SOL':
        case 'APTOS':
        case 'FLOW':
        case 'SUI':
          return {
            chainFamily: getChallengeDto.chainFamily,
            address: getChallengeDto.address,
            challenge: await this.authService.getOneTimeChallenge(
              getChallengeDto.address,
              getChallengeDto.chainFamily,
            ),
          } as AuthGetChallengeResult;
        default:
          throw new TypeError('getChallenge: Chain family not supported');
      }
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  // sendEmailOTP removed

  // isEmailAvailable and isUsernameAvailable removed

  // @dev isWalletAddressAvailable: check if a wallet address has been registered with Lootex ID
  @Get('/wallets/available')
  async isWalletAddressAvailable(
    @Query() isAddressAvailableDto: QueryByAddressBaseDto,
  ): Promise<boolean> {
    try {
      const existingWalletCount = await this.walletsRepository.count({
        where: {
          address: isAddressAvailableDto.address,
        },
      });
      return existingWalletCount === 0;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.UNAUTHORIZED);
    }
  }

  // @dev signUp: Create Lootex ID
  @Post('/web3/sign-up')
  async signUp(
    @Body() accountSignUpDto: AccountSignUpDto,
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Res({ passthrough: true }) response: ResponseWithCookie,
    @RealIP() realIp: string,
    @CFIpCountry() cfIpCountry: string,
  ): Promise<AuthSignUpResult> {
    try {
      // IP check removed

      if (
        !WEB3_SUPPORTED_CHAIN_FAMILIES.includes(accountSignUpDto.chainFamily)
      ) {
        throw new TypeError('signUp: unrecognised chain family');
      }
      let newAccountWalletPair: [Account, Wallet] = null;
      switch (accountSignUpDto.chainFamily) {
        case 'ETH':
          newAccountWalletPair = await this.authService.handleSignUpEth(
            accountSignUpDto,
            realIp,
            cfIpCountry,
          );
          break;
        default:
          throw new TypeError('signUp: Chain family not supported');
      }
      const [newAccount, newWallet] = newAccountWalletPair;
      const payload = new LootexJwtPayload(
        newAccount.id,
        newAccount.email,
        newAccount.username,
        newAccount.avatarUrl,
        newWallet.id,
      );
      const jwtToken: string = await this.jwtService.signAsync(
        payload.toObject(),
        {
          secret: this.configurationService.get('JWT_SECRET'),
          algorithm: this.configurationService.get('JWT_ALGORITHM'),
          expiresIn: this.configurationService.get('JWT_EXPIRES_IN'),
        },
      );
      response.cookie(
        this.configurationService.get('AUTH_JWT_COOKIE_KEY'),
        jwtToken,
        cookieOption,
      );

      return {
        id: newAccount.id,
        email: newAccount.email,
        username: newAccount.username,
        transport: newWallet.transport,
        address: newWallet.address,
        provider: newWallet.provider,
        walletId: newWallet.id,
      } as AuthSignUpResult;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.UNAUTHORIZED);
    }
  }

  // @dev signIn: Sign in to Lootex ID
  @UseInterceptors(AccountPrivateInterceptor)
  @Post('/web3/sign-in')
  async signIn(
    @Body() accountSignInDto: AccountAuthBaseDto,
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Res({ passthrough: true }) response: ResponseWithCookie,
    @RealIP() realIp: string,
    @CFIpCountry() cfIpCountry: string,
  ): Promise<any> {
    try {
      if (
        !WEB3_SUPPORTED_CHAIN_FAMILIES.includes(accountSignInDto.chainFamily)
      ) {
        throw new TypeError('signIn: unrecognised chain family');
      }
      let jwtToken = '';
      switch (accountSignInDto.chainFamily) {
        case 'ETH':
          jwtToken = await this.authService.handleSignInEth(accountSignInDto);
          break;
        default:
          throw new TypeError(
            `signIn: Chain family not supported: ${accountSignInDto.chainFamily}`,
          );
      }
      response.cookie(
        this.configurationService.get('AUTH_JWT_COOKIE_KEY'),
        jwtToken,
        cookieOption,
      );

      const jwdValue = this.jwtService.decode(jwtToken) as LootexJwtPayload;

      this.accountService.updateAccountLastLogin({
        username: jwdValue.username,
        ip: realIp,
        area: cfIpCountry,
      });

      return await this.accountService.getProfile(jwdValue.username);
    } catch (err) {
      if (
        err instanceof HttpException &&
        err.getStatus() === HttpStatus.FORBIDDEN
      ) {
        throw err;
      } else {
        throw new HttpException(err.message, HttpStatus.UNAUTHORIZED);
      }
    }
  }

  // @dev signout: Sign out from your Lootex ID, clears Cookie
  @UseGuards(AuthJwtGuard)
  @Get('/web3/sign-out')
  async signOut(
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Res({ passthrough: true }) response: ResponseWithCookie,
  ): Promise<boolean> {
    try {
      response.cookie(
        this.configurationService.get('AUTH_JWT_COOKIE_KEY'),
        '',
        {
          ...cookieOption,
          expires: AUTH_COOKIE_EXPIRE_DATE,
        },
      );
      return true;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.UNAUTHORIZED);
    }
  }

  // @dev getAccountInfo: Retrieve my Lootex ID
  @UseGuards(AuthJwtGuard)
  @Get('/accounts/me')
  async getAccountInfo(
    @CurrentUser() user: Account,
    @CurrentWallet() wallet: Wallet,
  ): Promise<AuthGetAccountInfoResult> {
    try {
      const currentUser = user.toJSON();
      const currentWallet = wallet.toJSON();
      return {
        id: currentUser.id,
        email: currentUser.email,
        username: currentUser.username,
        fullname: currentUser.fullname,
        avatarUrl: currentUser.avatarUrl,
        introduction: currentUser.introduction,
        walletId: currentWallet.id,
      } as AuthGetAccountInfoResult;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  // isWalletBound removed

  // bindWalletAndSignIn removed

  // unbindWalletById removed

  // @dev listWalletsByAccountId: retrieves array of bound wallets of one user
  @UseGuards(AuthJwtGuard)
  @Get('/accounts/:id/wallets')
  async listWalletsByAccountId(
    @CurrentUser() user: Account,
    @Param('id') accountId: string,
  ): Promise<Array<Wallet>> {
    try {
      // @dev ABAC later. Restrict access to own account for now.
      if (accountId !== user.id)
        throw new TypeError(
          'listWalletsByAccountId: access for own account only',
        );
      return this.walletsRepository.findAll({
        where: {
          accountId: user.id,
        },
        attributes: [
          'transport',
          'provider',
          'chainFamily',
          'isMainWallet',
          'address',
          'status',
        ],
      });
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

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
