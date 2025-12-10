import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';

import { pagination, parseLimit } from '@/common/utils/pagination';

@Injectable()
export class StudioAssetsListInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        assets: data.rows,
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}

@Injectable()
export class StudioContractsListInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        contracts: data.rows,
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}
