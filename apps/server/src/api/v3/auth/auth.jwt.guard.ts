/**
 * AuthJwtGuard
 * - Guard to validate JWT of Lootex ID and attach @CurrentUser
 */
import { AUTH_COOKIE_EXPIRE_DATE } from '@/common/utils';
import { Account, Wallet } from '@/model/entities';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CookieSerializeOptions } from 'cookie';
import { FlexCookieOption } from './auth.decorator';
import {
  LootexJwtPayload,
  RequestWithAuth,
  ResponseWithCookie,
} from './auth.interface';
import { InjectModel } from '@nestjs/sequelize';
import { BlockStatus } from '@/model/entities/constant-model';

@Injectable()
export class AuthJwtGuard implements CanActivate {
  constructor(
    @InjectModel(Account)
    private readonly accountsRepository: typeof Account,

    private readonly jwtService: JwtService,

    private readonly configService: ConfigService,
  ) { }

  /**
   * @private
   * @function throwExceptionAndClearJwt
   * @param {HttpArgumentsHost} ctx context, HTTP
   * @param {String} message error message
   * @param {HttpStatus} exceptionCode HTTP exception code, defaults to 401
   * @param {CookieSerializeOptions} cookieOption custom cookie options to override
   */
  private throwExceptionAndClearJwt(
    ctx: HttpArgumentsHost,
    message = 'AuthJwt: access denied',
    exceptionCode: HttpStatus = HttpStatus.UNAUTHORIZED,
    @FlexCookieOption()
    cookieOption: CookieSerializeOptions = {},
  ): void {
    ctx
      .getResponse<ResponseWithCookie>()
      .cookie(this.configService.get('AUTH_JWT_COOKIE_KEY'), '', {
        ...cookieOption,
        expires: AUTH_COOKIE_EXPIRE_DATE,
      });
    throw new HttpException(message, exceptionCode);
  }

  /**
   * @async
   * @function canActivate
   * @summary gives boolean: isAuthenticated. access denied if false. sets request.user
   * @param {ExecutionContext} context Nest.js execution context
   * @return {Promise<Boolean>} isAuthenticated
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx: HttpArgumentsHost = context.switchToHttp();
    const request: RequestWithAuth = ctx.getRequest<Request>();
    const jwtFromCookie: string =
      request.cookies[this.configService.get('AUTH_JWT_COOKIE_KEY')];
    if (!jwtFromCookie) {
      this.throwExceptionAndClearJwt(ctx, 'AuthJwt: no access token supplied');
    }

    const now = Number(new Date());
    let jwtPayload: LootexJwtPayload = null;
    try {
      jwtPayload = this.jwtService.verify(jwtFromCookie, {
        secret: this.configService.get('JWT_SECRET'),
        algorithms: [this.configService.get('JWT_ALGORITHM')],
      }) as LootexJwtPayload;
    } catch (e) {
      throw new HttpException(e.toString(), HttpStatus.UNAUTHORIZED);
    }

    if (now > jwtPayload?.exp * 10 ** 3) {
      this.throwExceptionAndClearJwt(ctx, 'AuthJwt: access token expired');
    }
    const currentUser: Account = await this.accountsRepository.findByPk(
      jwtPayload.sub,
      {
        include: [Wallet],
      },
    );
    if (!currentUser)
      this.throwExceptionAndClearJwt(ctx, 'AuthJwt: Lootex ID not found');
    if (currentUser.status !== 'ACTIVE') {
      this.throwExceptionAndClearJwt(ctx, 'AuthJwt: Lootex ID suspended');
    }
    if (currentUser.block === BlockStatus.BLOCKED) {
      this.throwExceptionAndClearJwt(
        ctx,
        'AuthJwt: Lootex ID blocked',
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      jwtPayload.email !== currentUser.email ||
      jwtPayload.username !== currentUser.username
    ) {
      this.throwExceptionAndClearJwt(
        ctx,
        'AuthJwt: access invalidated by account update',
      );
    }
    // @note iteration is cheaper than DB access
    const signedInWalletArr: Array<Wallet> = currentUser.wallets.filter(
      (wallet: Wallet) => wallet.id === jwtPayload.wallet_id,
    );
    if (signedInWalletArr.length !== 1) {
      this.throwExceptionAndClearJwt(ctx, 'AuthJwt: wallet fatal error');
    }
    if (signedInWalletArr[0].status !== 'ACTIVE') {
      this.throwExceptionAndClearJwt(ctx, 'AuthJwt: wallet suspended');
    }
    // @note enrich the Request object with current Lootex ID (UserAccounts)
    request.user = currentUser;
    // @note and of course, current wallet that is used to sign in
    request.wallet = signedInWalletArr[0];

    return true;
  }
}

@Injectable()
export class AuthJwtGuardOptional implements CanActivate {
  constructor(
    @InjectModel(Account)
    private readonly accountsRepository: typeof Account,

    private readonly jwtService: JwtService,

    private readonly configService: ConfigService,
  ) { }

  /**
   * @private
   * @function throwExceptionAndClearJwt
   * @param {HttpArgumentsHost} ctx context, HTTP
   * @param {String} message error message
   * @param {HttpStatus} exceptionCode HTTP exception code, defaults to 401
   * @param {CookieSerializeOptions} cookieOption custom cookie options to override
   */
  private throwExceptionAndClearJwt(
    ctx: HttpArgumentsHost,
    message = 'AuthJwt: access denied',
    exceptionCode: HttpStatus = HttpStatus.UNAUTHORIZED,
    @FlexCookieOption()
    cookieOption: CookieSerializeOptions = {},
  ): void {
    ctx
      .getResponse<ResponseWithCookie>()
      .cookie(this.configService.get('AUTH_JWT_COOKIE_KEY'), '', {
        ...cookieOption,
        expires: AUTH_COOKIE_EXPIRE_DATE,
      });
    throw new HttpException(message, exceptionCode);
  }

  /**
   * @async
   * @function canActivate
   * @summary gives boolean: isAuthenticated. access denied if false. sets request.user
   * @param {ExecutionContext} context Nest.js execution context
   * @return {Promise<Boolean>} isAuthenticated
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx: HttpArgumentsHost = context.switchToHttp();
    const request: RequestWithAuth = ctx.getRequest<Request>();
    const jwtFromCookie: string =
      request.cookies[this.configService.get('AUTH_JWT_COOKIE_KEY')];

    if (!jwtFromCookie) {
      // No JWT provided, just return true
      return true;
    }

    const now = Number(new Date());
    let jwtPayload: LootexJwtPayload = null;
    try {
      jwtPayload = this.jwtService.verify(jwtFromCookie, {
        secret: this.configService.get('JWT_SECRET'),
        algorithms: [this.configService.get('JWT_ALGORITHM')],
      }) as LootexJwtPayload;
    } catch (e) {
      return true;
    }

    if (now > jwtPayload?.exp * 10 ** 3) {
      return true;
    }

    const currentUser: Account = await this.accountsRepository.findByPk(
      jwtPayload.sub,
      {
        include: [Wallet],
      },
    );

    if (!currentUser)
      this.throwExceptionAndClearJwt(ctx, 'AuthJwt: Lootex ID not found');

    if (currentUser.status !== 'ACTIVE') {
      this.throwExceptionAndClearJwt(ctx, 'AuthJwt: Lootex ID suspended');
    }

    if (currentUser.block === BlockStatus.BLOCKED) {
      this.throwExceptionAndClearJwt(
        ctx,
        'AuthJwt: Lootex ID blocked',
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      jwtPayload.email !== currentUser.email ||
      jwtPayload.username !== currentUser.username
    ) {
      this.throwExceptionAndClearJwt(
        ctx,
        'AuthJwt: access invalidated by account update',
      );
    }

    const signedInWalletArr: Array<Wallet> = currentUser.wallets.filter(
      (wallet: Wallet) => wallet.id === jwtPayload.wallet_id,
    );

    if (signedInWalletArr.length !== 1) {
      this.throwExceptionAndClearJwt(ctx, 'AuthJwt: wallet fatal error');
    }

    if (signedInWalletArr[0].status !== 'ACTIVE') {
      this.throwExceptionAndClearJwt(ctx, 'AuthJwt: wallet suspended');
    }

    request.user = currentUser;
    request.wallet = signedInWalletArr[0];

    return true;
  }
}
