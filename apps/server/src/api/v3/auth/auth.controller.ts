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
  QueryByEmailBaseDto,
  QueryByUsernameBaseDto,
  QueryByAddressBaseDto,
  AccountNewWalletSignUpDto,
  AccountTorusSignUpDto,
  AccountTorusNewWalletSignUpDto,
  SocialConnectDTO,
  AccountPrivySignUpDto,
  GetChallengePlusDto,
  VerifyChallengePlusDto,
} from '@/api/v3/auth/auth.dto';
import { AuthService } from './auth.service';
import {
  AUTH_COOKIE_EXPIRE_DATE,
  WEB3_SUPPORTED_CHAIN_FAMILIES,
  LOOTEX_PRESET_ACCOUNT_ADDRESSES,
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
import { Roles } from '../role/role.decorator';
import { Role } from '../role/role.interface';
import { RoleGuard } from '../role/role.guard';
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
  ) {}

  // @dev debugJwtCookie: retrieves a JWT cookie for dev environment's preset accounts
  @Get('/debug/jwt-preset/get')
  async debugJwtCookie(
    @Headers() headers,
    @Query() queryByAddressDto: QueryByAddressBaseDto,
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Res({ passthrough: true }) response: ResponseWithCookie,
  ): Promise<string> {
    if (!DEV_ENVIRONMENT_HOST_REGEX.test(headers.host))
      throw new TypeError('debugJwtCookie: invalid origin');
    const { address } = queryByAddressDto;
    if (!LOOTEX_PRESET_ACCOUNT_ADDRESSES.includes(address))
      throw new TypeError('debugJwtCookie: invalid input');
    const thisWallet: Wallet = await Wallet.findOne({ where: { address } });
    if (!thisWallet)
      throw new TypeError('debugJwtCookie: wallet not found, migration?');
    const thisAccount: Account = await Account.findByPk(thisWallet.accountId);
    if (!thisAccount)
      throw new TypeError('debugJwtCookie: account not found, migration?');
    const payload = new LootexJwtPayload(
      thisAccount.id,
      thisAccount.email,
      thisAccount.username,
      thisAccount.avatarUrl,
      thisWallet.id,
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
    return `OK. Generated a JWT cookie for you (${thisAccount.username}, ${address})`;
  }

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

  // @dev sendEmailOTP: generates and sends a email with one-time password
  @Get('/email/send')
  async sendEmailOTP(@Query() sendEmailOtpDto: QueryByEmailBaseDto) {
    try {
      // The first call requires a reCAPTCHA, but subsequent calls do not.
      // However, the subsequent calls will be cached, and within 90 seconds, they cannot be repeated.
      const repeatCall = await this.cacheService.getCache(
        `otp-${sendEmailOtpDto.email}-repeat`,
      );
      if (repeatCall) {
        throw new TypeError('sendEmailOTP: Please wait for 90 seconds');
      }

      if (sendEmailOtpDto.recaptchaToken) {
        const _startTime = new Date().getTime();
        const recaptchaResponse = await this.httpService.axiosRef.post(
          `https://www.google.com/recaptcha/api/siteverify?secret=${this.configurationService.get(
            'RECAPTCHA_SECRET_KEY',
          )}&response=${sendEmailOtpDto.recaptchaToken}`,
        );
        const _endTime = new Date().getTime();
        this.logger.log(
          `sendEmailOTP recaptcha time ${sendEmailOtpDto.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')} ${(_endTime - _startTime) / 1000}s`,
        );
        if (recaptchaResponse.data.success) {
          // reset ttl
          await this.cacheService.delCache(
            `otp-${sendEmailOtpDto.email}-verified`,
          );
          await this.cacheService.setCache(
            `otp-${sendEmailOtpDto.email}-verified`,
            'true',
            3600,
          );
        }
      } else {
        throw new TypeError('sendEmailOTP: Invalid recaptcha token');
      }

      const haveVerified = await this.cacheService.getCache(
        `otp-${sendEmailOtpDto.email}-verified`,
      );
      if (haveVerified) {
        await this.cacheService.setCache(
          `otp-${sendEmailOtpDto.email}-repeat`,
          'true',
          90,
        );
        return this.authService.generateOtpAndSendEmail(sendEmailOtpDto.email);
      } else {
        throw new HttpException(`sendEmailOTP: Not verified`, 400);
      }
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  // @dev isEmailAvailable: check if an email has been registered with Lootex ID
  @Get('/email/available')
  async isEmailAvailable(
    @Query() isEmailAvailableDto: QueryByEmailBaseDto,
  ): Promise<boolean> {
    try {
      const account = await this.accountRepository.findOne({
        where: {
          email: isEmailAvailableDto.email,
        },
      });
      return !account;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.UNAUTHORIZED);
    }
  }

  // @dev isUsernameAvailable: check if an username has been registered with Lootex ID
  @Get('/username/available')
  async isUsernameAvailable(
    @Query() isUsernameAvailableDto: QueryByUsernameBaseDto,
  ): Promise<boolean> {
    try {
      const accountCount: number = await this.accountRepository.count({
        where: {
          username: isUsernameAvailableDto.username,
        },
      });
      return accountCount === 0;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.UNAUTHORIZED);
    }
  }

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
      if (
        this.configurationService.get('NODE_ENV') == 'development' &&
        realIp != '60.251.32.185' &&
        realIp != '211.72.136.150'
      ) {
        throw new HttpException('Invalid IP', HttpStatus.BAD_REQUEST);
      }

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

  // @dev isWalletBound: check if the wallet is already in Lootex ID registry
  @Get('/web3/wallets/is-bound')
  async isWalletBound(
    @Query() isWalletBoundDto: IsWalletBoundDto,
  ): Promise<boolean> {
    try {
      if (!isWalletBoundDto.address || !isWalletBoundDto.chainFamily) {
        throw new TypeError('isWalletBound: invalid parameters');
      }
      const wallet: Wallet = await this.walletsRepository.findOne({
        where: {
          address: isWalletBoundDto.address,
          chainFamily: isWalletBoundDto.chainFamily,
        },
      });
      return !!wallet;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  // @dev newWalletSignIn: binds a new wallet to Lootex ID and sign in
  @Post('/web3/new-wallet-sign-in')
  async bindWalletAndSignIn(
    @Body() accountNewWalletSignUpDto: AccountNewWalletSignUpDto,
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Res({ passthrough: true }) response: ResponseWithCookie,
  ): Promise<AuthSignUpResult> {
    try {
      if (
        !WEB3_SUPPORTED_CHAIN_FAMILIES.includes(
          accountNewWalletSignUpDto.chainFamily,
        )
      ) {
        throw new TypeError('newWalletSignIn: unrecognised chain family');
      }
      let accountWalletPair;
      switch (accountNewWalletSignUpDto.chainFamily) {
        case 'ETH':
          accountWalletPair =
            await this.authService.handleBindWalletAndSignInEth(
              accountNewWalletSignUpDto,
            );
          break;
        default:
          throw new TypeError('newWalletSignIn: Chain family not supported');
      }
      const [newAccount, newWallet] = accountWalletPair;
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

  // @dev unbindWalletById: removes a wallet that is already bound
  @UseGuards(AuthJwtGuard)
  @Delete('/web3/wallets/:id/unbind')
  async unbindWalletById(
    @CurrentUser() user: Account,
    @Param('id') walletId: string,
  ): Promise<string> {
    try {
      const wallet: Wallet = await this.walletsRepository.findByPk(walletId);
      if (!wallet) throw new TypeError('unbindById: wallet not found');
      if (wallet.accountId !== user.id)
        throw new TypeError('unbindById: the wallet is not yours');
      if (user.wallets.length === 1)
        throw new TypeError('unbindById: cannot remove sole wallet');
      await wallet.destroy({ force: true });
      return walletId;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

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
