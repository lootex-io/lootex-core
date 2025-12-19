import { BaseExceptionFilter } from '@nestjs/core';
import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { Request } from 'express';

@Catch()
export class AllExceptionFilter extends BaseExceptionFilter {
  constructor() {
    super();
  }
  catch(exception: any, host: ArgumentsHost): any {
    // this.handlerRpcException(exception, host);
    this.handlerSentryException(exception, host);
    super.catch(exception, host);
  }

  handlerRpcException(exception: any, host: ArgumentsHost) {
    if (exception instanceof Error) {
      const message = exception?.message ?? '';
      const stack = exception?.stack ?? '';
      // console.log('stack ', exception.stack, ', aaaa');
    }
  }

  handlerSentryException(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    // 從請求中提取信息
    const { method, url, headers, body, query } = request;
    const statusCode =
      exception instanceof Error &&
      'status' in exception &&
      typeof exception['status'] === 'number'
        ? exception['status']
        : HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
