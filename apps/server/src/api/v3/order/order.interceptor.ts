import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  OrderListResponse,
  OrderHistoryListResponse,
} from '@/api/v3/order/order.interface';
import { pagination, parseLimit } from '@/common/utils/pagination';

@Injectable()
export class OrderList implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<OrderListResponse> {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        orders: data.orders,
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}

@Injectable()
export class OrderHistoryList implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<OrderHistoryListResponse> {
    const requestQuery = context.switchToHttp().getRequest().query;
    const page = parseInt(requestQuery.page, 10);
    const limit = parseLimit(requestQuery.limit);

    return next.handle().pipe(
      map((data) => ({
        ordersHistory: data.ordersHistory,
        pagination: pagination(data.count, page, limit),
      })),
    );
  }
}
