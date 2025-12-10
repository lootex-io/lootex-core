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
  @Post('/web3/sign-up/private')
  async signUpPrivate(
    @Body() accountSignUpDto: AccountSignUpDto,
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Res({ passthrough: true }) response: ResponseWithCookie,
    @RealIP() ip,
  ): Promise<AuthSignUpResult> {
    try {
      //[公司, slider, slider]
      const ipWhitelist = [
        '60.251.32.185',
        '114.136.215.157',
        '211.72.136.150',
      ];
      if (!ipWhitelist.includes(ip)) {
        throw new HttpException('Invalid IP', HttpStatus.BAD_REQUEST);
      }

      if (
        accountSignUpDto.referralCode &&
        !this.authService.isReferralCodeExists(accountSignUpDto.referralCode)
      ) {
        throw new HttpException(
          'Invalid referral code',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (
        !WEB3_SUPPORTED_CHAIN_FAMILIES.includes(accountSignUpDto.chainFamily)
      ) {
        throw new TypeError('signUp: unrecognised chain family');
      }
      let newAccountWalletPair: [Account, Wallet] = null;
      switch (accountSignUpDto.chainFamily) {
        case 'ETH':
          newAccountWalletPair =
            await this.authService.handleSignUpEthPrivate(accountSignUpDto);
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

      let referrer: Account = null;
      if (accountSignUpDto.referralCode) {
        referrer = await this.authService.completeReferral(
          newAccount.id,
          accountSignUpDto.referralCode,
          ip,
        );
      }

      return {
        id: newAccount.id,
        email: newAccount.email,
        username: newAccount.username,
        transport: newWallet.transport,
        address: newWallet.address,
        provider: newWallet.provider,
        walletId: newWallet.id,
        referrer,
      } as AuthSignUpResult;
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
        accountSignUpDto.referralCode &&
        !this.authService.isReferralCodeExists(accountSignUpDto.referralCode)
      ) {
        throw new HttpException(
          'Invalid referral code',
          HttpStatus.BAD_REQUEST,
        );
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
        case 'SOL':
          newAccountWalletPair =
            await this.authService.handleSignUpSol(accountSignUpDto);
          break;
        case 'APTOS':
          newAccountWalletPair =
            await this.authService.handleSignUpAptos(accountSignUpDto);
          break;
        case 'FLOW':
          newAccountWalletPair =
            await this.authService.handleSignUpFlow(accountSignUpDto);
          break;
        case 'SUI':
          newAccountWalletPair =
            await this.authService.handleSignUpSui(accountSignUpDto);
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

      let referrer: Account = null;
      if (accountSignUpDto.referralCode) {
        referrer = await this.authService.completeReferral(
          newAccount.id,
          accountSignUpDto.referralCode,
          realIp,
        );
      }

      return {
        id: newAccount.id,
        email: newAccount.email,
        username: newAccount.username,
        transport: newWallet.transport,
        address: newWallet.address,
        provider: newWallet.provider,
        walletId: newWallet.id,
        referrer,
      } as AuthSignUpResult;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.UNAUTHORIZED);
    }
  }

  //TODO: no longer used
  // @dev signUpTorus: Create Lootex ID with Torus Custodial Wallet
  @Post('/web3/sign-up-torus')
  async signUpTorus(
    @Body() accountSignUpDto: AccountTorusSignUpDto,
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Res({ passthrough: true }) response: ResponseWithCookie,
    @Ip() ip,
  ): Promise<AuthSignUpResult> {
    try {
      if (
        accountSignUpDto.referralCode &&
        !this.authService.isReferralCodeExists(accountSignUpDto.referralCode)
      ) {
        throw new HttpException(
          'Invalid referral code',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (
        accountSignUpDto.provider !==
        AuthSupportedWalletProviderEnum.TORUS_LIBRARY
      ) {
        throw new TypeError('signUpTorus: unknown provider');
      }
      if (accountSignUpDto.transport !== AuthSupportedWalletTransport.LIBRARY) {
        throw new TypeError('signUpTorus: transport invalid');
      }
      if (accountSignUpDto.chainFamily !== AuthSupportedChainFamily.ETH) {
        throw new TypeError('signUpTorus: chainFamily invalid');
      }
      const [newAccount, newWallet]: [Account, Wallet] =
        await this.authService.handleSignUpTorus(accountSignUpDto);
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

      let referrer: Account = null;
      if (accountSignUpDto.referralCode) {
        referrer = await this.authService.completeReferral(
          newAccount.id,
          accountSignUpDto.referralCode,
          ip,
        );
      }

      return {
        id: newAccount.id,
        email: newAccount.email,
        username: newAccount.username,
        transport: newWallet.transport,
        address: newWallet.address,
        provider: newWallet.provider,
        walletId: newWallet.id,
        referrer,
      } as AuthSignUpResult;
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.UNAUTHORIZED);
    }
  }

  @Post('/web3/sign-up-privy')
  async signUpPrivy(
    @Body() accountSignUpDto: AccountPrivySignUpDto,
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Headers() headers: Record<string, string>,
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

      const privyJwt = headers['authorization'].replace('Bearer ', '');

      if (!privyJwt) {
        throw new HttpException('Invalid privyJwt', HttpStatus.BAD_REQUEST);
      }

      if (
        accountSignUpDto.referralCode &&
        !this.authService.isReferralCodeExists(accountSignUpDto.referralCode)
      ) {
        throw new HttpException(
          'Invalid referral code',
          HttpStatus.BAD_REQUEST,
        );
      }

      const newAccountWalletPair: [Account, Wallet] =
        await this.authService.handleSignUpPrivy(
          accountSignUpDto.username,
          privyJwt,
          realIp,
          cfIpCountry,
        );
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

      let referrer: Account = null;
      if (accountSignUpDto.referralCode) {
        referrer = await this.authService.completeReferral(
          newAccount.id,
          accountSignUpDto.referralCode,
          realIp,
        );
      }

      return {
        id: newAccount.id,
        email: newAccount.email,
        username: newAccount.username,
        transport: newWallet.transport,
        address: newWallet.address,
        provider: newWallet.provider,
        walletId: newWallet.id,
        referrer,
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
        case 'SOL':
          jwtToken = await this.authService.handleSignInSol(accountSignInDto);
          break;
        case 'APTOS':
          jwtToken = await this.authService.handleSignInAptos(accountSignInDto);
          break;
        case 'FLOW':
          jwtToken = await this.authService.handleSignInFlow(accountSignInDto);
          break;
        case 'SUI':
          jwtToken = await this.authService.handleSignInSui(accountSignInDto);
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

  // @dev signIn: Sign in to Lootex ID
  @UseInterceptors(AccountPrivateInterceptor)
  @Post('/web3/sign-in/privy')
  async signInByPrivy(
    @Body() accountSignInDto: { privyJwt: string },
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Headers() headers: Record<string, string>,
    @Res({ passthrough: true }) response: ResponseWithCookie,
    @RealIP() realIp: string,
    @CFIpCountry() cfIpCountry: string,
  ): Promise<boolean> {
    try {
      const privyJwt = headers['authorization'].replace('Bearer ', '');
      if (!privyJwt) {
        throw new HttpException('Invalid privyJwt', HttpStatus.BAD_REQUEST);
      }

      const jwtToken = await this.authService.handleSignInPrivy(privyJwt);
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
        case 'SOL':
          accountWalletPair =
            await this.authService.handleBindWalletAndSignInSol(
              accountNewWalletSignUpDto,
            );
          break;
        case 'APTOS':
          accountWalletPair =
            await this.authService.handleBindWalletAndSignInAptos(
              accountNewWalletSignUpDto,
            );
          break;
        case 'FLOW':
          accountWalletPair =
            await this.authService.handleBindWalletAndSignInFlow(
              accountNewWalletSignUpDto,
            );
          break;
        case 'SUI':
          accountWalletPair =
            await this.authService.handleBindWalletAndSignInSui(
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

  // @dev newWalletSignInTorus: binds a new Torus wallet to Lootex ID and sign in
  @Post('/web3/new-wallet-sign-in-torus')
  async bindWalletAndSignInTorus(
    @Body() accountNewWalletSignUpDto: AccountTorusNewWalletSignUpDto,
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Res({ passthrough: true }) response: ResponseWithCookie,
  ): Promise<AuthSignUpResult> {
    try {
      if (
        accountNewWalletSignUpDto.provider !==
        AuthSupportedWalletProviderEnum.TORUS_LIBRARY
      ) {
        throw new TypeError('bindWalletAndSignInTorus: unknown provider');
      }
      if (
        !accountNewWalletSignUpDto.address ||
        !accountNewWalletSignUpDto.signature
      ) {
        throw new TypeError('bindWalletAndSignInTorus: invalid credentials');
      }
      if (
        accountNewWalletSignUpDto.transport !==
        AuthSupportedWalletTransport.LIBRARY
      ) {
        throw new TypeError('bindWalletAndSignInTorus: transport invalid');
      }
      if (
        accountNewWalletSignUpDto.chainFamily !== AuthSupportedChainFamily.ETH
      ) {
        throw new TypeError('bindWalletAndSignInTorus: chainFamily invalid');
      }
      const [newAccount, newWallet] =
        await this.authService.handleBindWalletAndSignInEthTorus(
          accountNewWalletSignUpDto,
        );
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

  @Post('/web3/new-wallet-sign-in-privy')
  async bindWalletAndSignInPrivy(
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Headers() headers: Record<string, string>,
    @Res({ passthrough: true }) response: ResponseWithCookie,
  ): Promise<AuthSignUpResult> {
    try {
      const privyJwt = headers['authorization'].replace('Bearer ', '');

      if (!privyJwt) {
        throw new HttpException('Invalid privyJwt', HttpStatus.BAD_REQUEST);
      }

      const [newAccount, newWallet] =
        await this.authService.handleBindWalletAndSignInPrivy(privyJwt);
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

  @Get('/referral/is-exists/:referralCode')
  async isReferralCodeExists(
    @Param('referralCode') referralCode: string,
  ): Promise<boolean> {
    try {
      return await this.authService.isReferralCodeExists(referralCode);
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

  // ===========================
  // ========== Privy ==========
  // ===========================
  @Get('/privy/verify')
  async privyVerify(@Headers() headers: Record<string, string>) {
    try {
      const privyJwt = headers['authorization'].replace('Bearer ', '');
      if (!privyJwt) throw new TypeError('Invalid privyJwt');

      return await this.authService.getPrivyUserInfoByPrivyJwt(privyJwt);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Roles(Role.Admin)
  @UseGuards(AuthJwtGuard, RoleGuard)
  @Get('/privy/user')
  async privyUser(@Query('privyUserId') privyUserId: string) {
    try {
      return await this.authService.getPrivyUserInfoByPrivyUserId(privyUserId);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('/privy/is-bound')
  async privyIsSignedUp(@Headers() headers: Record<string, string>) {
    try {
      const privyJwt = headers['authorization'].replace('Bearer ', '');
      if (!privyJwt) throw new TypeError('Invalid privyJwt');

      return await this.authService.privyIsBound(privyJwt);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('privy/sync/wallets')
  async syncPrivyWallet(
    @Headers() headers: Record<string, string>,
  ): Promise<boolean> {
    try {
      const privyJwt = headers['authorization'].replace('Bearer ', '');
      if (!privyJwt) throw new TypeError('Invalid privyJwt');

      return await this.authService.syncPrivyWallets(privyJwt);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ====================================
  // ========== Social Connect ==========
  // ====================================

  // social-connect oauth2
  @UseGuards(AuthJwtGuard)
  @Post('/social-connect')
  async socialConnect(
    @CurrentUser() user: Account,
    @Body() socialConnectDTO: SocialConnectDTO,
  ) {
    try {
      return await this.authService.socialConnect(user.id, socialConnectDTO);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(AuthJwtGuard)
  @Put('/social-disconnect/:platform')
  async socialDisconnect(
    @CurrentUser() user: Account,
    @Param('platform') platform: SocialPlatform,
  ) {
    try {
      return await this.authService.socialDisconnect(user.id, platform);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @UseGuards(AuthJwtGuard)
  @Get('/social-connect')
  async getSocialConnectStatus(@CurrentUser() user: Account) {
    try {
      return await this.authService.getSocialConnectStatus(user.id);
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  // oauth facebook

  // discord
  /**
   * 前端的 oauth bottom 直接用這隻 API
   * @param callbackRedirectUri
   * @param user
   * @param req
   * @param res
   */
  @Get('/discord')
  @UseGuards(AuthJwtGuard)
  async getDiscordLogin(
    @Query('redirectUri') redirectUri: string,
    @CurrentUser() user: Account,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    if (redirectUri) {
      await this.cacheService.setCache(`discord:${user.id}`, redirectUri, 3600);
    }

    res.redirect(`/api/v3/auth/discord/auth`);
  }

  @Get('discord/auth')
  @UseGuards(AuthGuard('discord'))
  async discordAuth(@Req() req) {
    // 重定向到 discord.strategy，不執行這裡的邏輯
    console.log('auth catch');
  }

  @Get('discord/callback')
  @UseGuards(AuthGuard('discord'))
  async discordCallback(
    @Req() req,
    @Res() res: Response,
    @Query() query?: any,
  ) {
    if (query?.error) {
      return res.redirect(
        `${this.configurationService.get('FRONTEND_BASE_URL')}/account/settings/social-accounts?auth=discord&success=false&reason=${query.error}`,
      );
    }
    const providerAccountId = req.user.providerAccountId;
    const accessToken = req.user.accessToken;
    const expires_at = null;
    const refreshToken = req.user.refreshToken;
    const email = req.user?.email;
    const name = req.user?.name;
    const picture = req.user?.picture;

    const auth = 'discord';
    const accountId = req.user.accountId;
    const username = req.user.username;
    const frontEndBaseUrl = this.configurationService.get('FRONTEND_BASE_URL');
    const defaultCallbackUri = '/account/settings/social-accounts';
    const cacheKey = `discord:${accountId}`;
    const callbackUri =
      ((await this.cacheService.getCache(cacheKey)) as string) ||
      defaultCallbackUri;

    try {
      await this.authService.socialConnectDiscord(accountId, {
        provider: SocialPlatform.DISCORD,
        providerAccountId,
        accessToken,
        expires_at,
        refreshToken,
        name,
        picture,
        email,
      });

      const redirectUrl = `${frontEndBaseUrl}${callbackUri}?auth=${auth}&success=true`;
      this.logger.debug(
        `[connect discord success] accountId: ${accountId} discordname: ${username} redirectUrl: ${redirectUrl}`,
      );
      return res.redirect(redirectUrl);
    } catch (err) {
      const redirectUrl = `${frontEndBaseUrl}${callbackUri}?auth=${auth}&success=false&reason=${err.message}`;
      this.logger.debug(
        `[connect discord failed] accountId: ${accountId} discordname: ${username} redirectUrl: ${redirectUrl}`,
      );
      return res.redirect(redirectUrl);
    }
  }

  // twitter
  @UseGuards(AuthJwtGuard)
  @Get('/twitter')
  async getTwitterAuthUrl(
    @Query('redirectUri') callbackRedirectUri: string,
    @CurrentUser() user: Account,
  ): Promise<any> {
    const state = callbackRedirectUri
      ? `${user.id};${callbackRedirectUri}`
      : user.id;
    const clientId = this.configurationService.get('TWITTER_CLIENT_ID');
    const redirectUri = this.configurationService.get('TWITTER_REDIRECT_URI');
    // 生成一個隨機的 code_verifier
    const codeVerifier = randomBytes(32).toString('hex');
    // 使用 SHA-256 算法生成 code_challenge
    const hash = createHash('sha256').update(codeVerifier).digest('base64');
    // 進行 URL-safe base64 編碼，這裡需要把 '+' 換成 '-'，'/' 換成 '_'，並去掉尾部的 '='
    const challenge = hash
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await this.cacheService.setCache(`twitter:${user.id}`, codeVerifier, 3600);

    const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=tweet.read%20users.read%20follows.read%20offline.access&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
    return {
      url: twitterAuthUrl,
    };
  }

  @Get('/twitter/callback')
  async getTwitterCallback(
    @Query() query: { state: string; code: string },
    @Res() res: Response,
  ): Promise<any> {
    try {
      const parts = query.state.split(';');
      const accountId = parts[0];
      const callbackRedirectUri = parts[1];

      const codeVerifier = (await this.cacheService.getCache(
        `twitter:${accountId}`,
      )) as string;

      const authorization = Buffer.from(
        `${this.configurationService.get(
          'TWITTER_CLIENT_ID',
        )}:${this.configurationService.get('TWITTER_CLIENT_SECRET')}`,
        'utf8',
      ).toString('base64');
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authorization}`,
      };

      const data = {
        code: query.code,
        grant_type: 'authorization_code',
        redirect_uri: this.configurationService.get('TWITTER_REDIRECT_URI'),
        code_verifier: codeVerifier,
      };

      const twitterToken: {
        token_type: 'bearer';
        expires_in: 7200;
        access_token: string;
        scope: 'users.read follows.read tweet.read offline.access';
        refresh_token: string;
      } = (
        await axios.post(
          'https://api.twitter.com/2/oauth2/token',
          stringify(data),
          { headers },
        )
      ).data;

      const twitterUser: {
        id: string;
        profile_image_url: string;
        username: string;
        name: string;
      } = (
        await axios.get(
          'https://api.twitter.com/2/users/me?user.fields=profile_image_url',
          {
            headers: {
              Authorization: `Bearer ${twitterToken.access_token}`,
            },
          },
        )
      ).data.data;

      const connectSuccess = await this.authService.socialConnectTwitter({
        accountId,
        providerAccountId: twitterUser.id,
        name: twitterUser.name,
        picture: twitterUser.profile_image_url,
        accessToken: twitterToken.access_token,
        refreshToken: twitterToken.access_token,
      });

      if (!connectSuccess.success) {
        return res.redirect(
          `${this.configurationService.get(
            'FRONTEND_BASE_URL',
          )}/account/settings/social-accounts?auth=twitter&success=false&reason=${
            connectSuccess.reason
          }`,
        );
      }

      if (callbackRedirectUri) {
        return res.redirect(
          `${this.configurationService.get(
            'FRONTEND_BASE_URL',
          )}/${callbackRedirectUri}`,
        );
      } else {
        return res.redirect(
          `${this.configurationService.get(
            'FRONTEND_BASE_URL',
          )}/account/settings/social-accounts?auth=twitter&success=true`,
        );
      }
    } catch (err) {
      return res.redirect(
        `${this.configurationService.get(
          'FRONTEND_BASE_URL',
        )}/account/settings/social-accounts?auth=twitter&success=false&reason=${err.message}`,
      );
    }
  }

  // revoke
  @UseGuards(AuthJwtGuard)
  @Put('/twitter/revoke')
  async revokeTwitter(
    @CurrentUser() user: Account,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // curl --location --request POST 'https://api.twitter.com/2/oauth2/revoke' \
      // --header 'Content-Type: application/x-www-form-urlencoded' \
      // --header 'Authorization: Basic V1ROclFTMTRiVWhwTWw4M2FVNWFkVGQyTldNNk1UcGphUTotUm9LeDN4NThKQThTbTlKSXQyZm1BanEzcTVHWC1icVozdmpKeFNlR3NkbUd0WEViUA=='\
      // --data-urlencode 'token=Q0Mzb0VhZ0V5dmNXSTEyNER2MFNfVW50RzdXdTN6STFxQlVkTGhTc1lCdlBiOjE2MjIxNDc3NDM5MTQ6MToxOmF0OjE'
      const accountTwitterConnect =
        await this.accountSocialTokenRepository.findOne({
          where: {
            accountId: user.id,
            provider: SocialPlatform.TWITTER,
          },
        });

      await this.accountSocialTokenRepository.destroy({
        where: {
          accountId: user.id,
          provider: SocialPlatform.TWITTER,
        },
      });

      this.httpService.post(
        'https://api.twitter.com/2/oauth2/revoke',
        stringify({
          token: accountTwitterConnect.accessToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(
              `${this.configurationService.get(
                'TWITTER_CLIENT_ID',
              )}:${this.configurationService.get('TWITTER_CLIENT_SECRET')}`,
              'utf8',
            ).toString('base64')}`,
          },
        },
      );

      return res.redirect(
        `${this.configurationService.get(
          'FRONTEND_BASE_URL',
        )}/account/settings/social-accounts?auth=twitter&success=true`,
      );
    } catch (err) {
      return res.redirect(
        `${this.configurationService.get(
          'FRONTEND_BASE_URL',
        )}/account/settings/social-accounts?auth=twitter&success=false`,
      );
    }
  }

  @Roles(Role.Admin)
  @UseGuards(AuthJwtGuard, RoleGuard)
  @Post('/pregenerate-sa-address')
  async preGenerateSAAddress(@Body() emails: string[]) {
    return await this.authService.preGenerateSAAddresses(emails);
  }

  // get caller ip
  @Get('/ip')
  getCallerIp(
    @Ip() ip: string,
    @RealIP() realIp: string,
    @CFIp() cfIp: string,
    @CFIpCountry() cfIpCountry: string,
  ) {
    return `ip: ${ip}, realIp: ${realIp}, cfIp: ${cfIp}, cfIpCountry: ${cfIpCountry}`;
  }

  // @dev getChallenge: generates a random one-time challenge for the user
  @Get('/challenge/get/plus')
  async getChallengePlus(
    @Query() getChallengeDto: GetChallengePlusDto,
  ): Promise<LoginPayload> {
    try {
      return await this.authService.getOneTimeChallengePlus(
        getChallengeDto.address,
      );
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('/challenge/verify/plus')
  async verifyChallengePlus(
    @Body() bodyDto: VerifyChallengePlusDto,
    @FlexCookieOption() cookieOption: CookieSerializeOptions,
    @Res({ passthrough: true }) response: ResponseWithCookie,
    @RealIP() realIp: string,
    @CFIpCountry() cfIpCountry: string,
  ): Promise<LoginPayload> {
    try {
      const jwtToken =
        await this.authService.verifyOneTimeChallengePlus(bodyDto);

      response.cookie(
        this.configurationService.get('AUTH_JWT_COOKIE_KEY'),
        jwtToken,
        cookieOption,
      );
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }
}
