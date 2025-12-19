import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { pagination, parseLimit } from '@/common/utils/pagination';

@Injectable()
export class WalletList implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        wallets: data.map((wallet) => {
          return {
            chainFamily: wallet.chainFamily,
            provider: wallet.provider,
            isMainWallet: wallet.isMainWallet,
            address: wallet.address,
            status: wallet.status,
          };
        }),
      })),
    );
  }
}
@Injectable()
export class WalletHistoryList implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        walletHistories: data.rows,
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}
