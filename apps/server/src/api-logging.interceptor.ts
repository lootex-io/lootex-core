import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiLogService } from './core/log/api-log.service';
import { SdkApiKeyService } from '@/core/sdk/service/sdk-api-key.service';
import * as requestIp from '@supercharge/request-ip';

@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiLoggingInterceptor.name);
  constructor(
    private readonly apiLogService: ApiLogService,
    private readonly sdkApiKeyService: SdkApiKeyService,
  ) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, url, path, params, query, body, ip, headers } = request;
    this.logger.log(`${method} ${path}`);
    const startTime = new Date();
    const apiKey = headers['x-api-key'] || null;
    const area = request.headers['cf-ipcountry'] || null;
    const lootexUsername = request.user?.username || null;

    // 是否在IP白名单
    const realIp = requestIp.getClientIp(request);
    if (!this.sdkApiKeyService.isWhiteIp(realIp)) {
      const referer =
        request.headers.origin ||
        request.headers.referer ||
        request.headers.referrer;
      let refererHost;
      // console.log('ori request.headers', request.headers);

      // 檢查特殊情況：x-client-id 為 lootex
      const clientId = request.headers['x-client-id'];

      if (clientId === 'lootex' && apiKey) {
        // console.log('ori request clientId', clientId);
        // 只需驗證 apiKey 是否合法
        // console.log('apiKey', apiKey);
        // console.log('process.env.FRONTEND_BASE_URL', process.env.FRONTEND_BASE_URL);
        if (
          this.sdkApiKeyService.validateApiKey(
            apiKey,
            process.env.FRONTEND_BASE_URL.replace(/^https?:\/\//, ''),
          )
        ) {
          return next.handle().pipe(
            map(async (data) => {
              const responseTime = new Date();
              const duration = responseTime.getTime() - startTime.getTime();
              const statusCode = response.statusCode;

              // 保存成功記錄到資料庫
              await this.apiLogService.log({
                method,
                statusCode,
                url: path,
                params: JSON.stringify(params),
                query: JSON.stringify(query),
                body: JSON.stringify(body),
                lootexUsername,
                apiKey,
                ip,
                area,
                startTime: startTime,
                responseTime: responseTime,
                duration: duration,
                errorMessage: null,
              });
              return data;
            }),
            catchError((error) => {
              console.log(error);

              const responseTime = new Date();
              const duration = responseTime.getTime() - startTime.getTime();

              // 提取錯誤資訊
              const statusCode = error.getStatus ? error.getStatus() : 500;
              const errorMessage =
                typeof error.response === 'object'
                  ? error.response?.message?.toString() || error.message
                  : error.message;

              // 保存錯誤記錄到資料庫
              this.apiLogService.log({
                method,
                statusCode,
                url,
                params: JSON.stringify(params),
                query: JSON.stringify(query),
                body: JSON.stringify(body),
                lootexUsername,
                apiKey,
                ip,
                area,
                startTime: startTime,
                responseTime: responseTime,
                duration: duration,
                errorMessage, // 原始錯誤訊息
              });

              // 繼續向上拋出原始錯誤
              return throwError(() => error);
            }),
          );
        }
      }
      try {
        refererHost = new URL(referer).host;
        // console.log('refererHost', refererHost);
      } catch (e) {
        console.log('refererHost not found');
      }

      if (!this.sdkApiKeyService.isWhitePath(path)) {
        // api-key 条件校验
        if (!apiKey || !this.validateApikey(apiKey, refererHost)) {
          // 如果不满足条件，抛出异常
          throw new BadRequestException(
            'Invalid request for API key parameter',
          );
        }
      }
    }

    return next.handle().pipe(
      map(async (data) => {
        const responseTime = new Date();
        const duration = responseTime.getTime() - startTime.getTime();
        const statusCode = response.statusCode;

        // 保存成功記錄到資料庫
        await this.apiLogService.log({
          method,
          statusCode,
          url: path,
          params: JSON.stringify(params),
          query: JSON.stringify(query),
          body: JSON.stringify(body),
          lootexUsername,
          apiKey,
          ip,
          area,
          startTime: startTime,
          responseTime: responseTime,
          duration: duration,
          errorMessage: null, // 成功的請求沒有錯誤訊息
        });
        return data;
      }),
      catchError((error) => {
        console.log(error);

        const responseTime = new Date();
        const duration = responseTime.getTime() - startTime.getTime();

        // 提取錯誤資訊
        const statusCode = error.getStatus ? error.getStatus() : 500;
        const errorMessage =
          typeof error.response === 'object'
            ? error.response?.message?.toString() || error.message
            : error.message;

        // 保存錯誤記錄到資料庫
        this.apiLogService.log({
          method,
          statusCode,
          url,
          params: JSON.stringify(params),
          query: JSON.stringify(query),
          body: JSON.stringify(body),
          lootexUsername,
          apiKey,
          ip,
          area,
          startTime: startTime,
          responseTime: responseTime,
          duration: duration,
          errorMessage, // 原始錯誤訊息
        });

        // 繼續向上拋出原始錯誤
        return throwError(() => error);
      }),
    );
  }

  validateApikey(apiKey: string, host: string) {
    if (apiKey && host) {
      if (this.sdkApiKeyService.validateApiKey(apiKey, host)) {
        return true;
      }
    }
    return false;
  }
}
