import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { pagination, parseLimit } from '@/common/utils/pagination';
import {
  AccountsResponse,
  ReturnAccountResponse,
} from '@/api/v3/account/account.interface';

@Injectable()
export class AccountList implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<AccountsResponse> {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        queueStatus: data.queueStatus,
        accounts: data.accounts.map((account) => {
          return {
            accountId: account.id,
            username: account.username,
            avatarUrl: account.avatarUrl,
            introduction: account.introduction,
            externalLinks: account.externalLinks,
            badge: account.Badge?.name || null,
            avatarDecoration: account.AvatarDecoration?.name || null,
            follower: account.follower,
            isFollowing: account.isFollowing, // get account following and follower
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          };
        }),
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}

export class AccountInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ReturnAccountResponse> {
    return next.handle().pipe(
      map((data) => {
        return {
          username: data.username,
          fullname: data.fullname,
          avatarUrl: data.avatarUrl,
          introduction: data.introduction,
          status: data.status,
          externalLinks: data.externalLinks,
          wallets: data.wallets,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          deletedAt: data.deletedAt,
          roles: data.roles,

          badgeId: data.badgeId,
          avatarDecorationId: data.avatarDecorationId,
          referralCode: data.referralCode,
          Badges: data.Badges,
          Badge: data.Badge,
          AvatarDecoration: data.AvatarDecoration,
          AvatarDecorations: data.AvatarDecorations,
          Campaign202306Mission: data.Campaign202306Mission,
          AccountSocialTokens: data.AccountSocialTokens,

          follower: data.follower,
          following: data.following,
          chainDataVisibility: data.chainDataVisibility,
        };
      }),
    );
  }
}

export class AccountPrivateInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ReturnAccountResponse> {
    return next.handle().pipe(
      map((data) => {
        return {
          username: data.username,
          fullname: data.fullname,
          email: data.email,
          avatarUrl: data.avatarUrl,
          introduction: data.introduction,
          status: data.status,
          externalLinks: data.externalLinks,
          wallets: data.wallets,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          deletedAt: data.deletedAt,
          roles: data.roles,

          badgeId: data.badgeId,
          avatarDecorationId: data.avatarDecorationId,
          referralCode: data.referralCode,
          Badges: data.Badges,
          Badge: data.Badge,
          AvatarDecoration: data.AvatarDecoration,
          AvatarDecorations: data.AvatarDecorations,
          Campaign202306Mission: data.Campaign202306Mission,
          AccountSocialTokens: data.AccountSocialTokens,

          follower: data.follower,
          following: data.following,
          chainDataVisibility: data.chainDataVisibility,
          renameCount: data?.renameCount,
        };
      }),
    );
  }
}

@Injectable()
export class OwnerList implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<AccountsResponse> {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        queueStatus: data.queueStatus,
        accounts: data.accounts,
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}

@Injectable()
export class ReferralAccountList implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<AccountsResponse> {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        accounts: data.accounts,
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}
