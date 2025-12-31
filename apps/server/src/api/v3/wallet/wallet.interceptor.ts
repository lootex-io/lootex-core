import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
