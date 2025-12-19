import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { SdkApiKeyService } from '@/core/sdk/service/sdk-api-key.service';
import * as requestIp from '@supercharge/request-ip';

@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiLoggingInterceptor.name);
  constructor(
    private readonly sdkApiKeyService: SdkApiKeyService,
  ) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const { method, path, apiKey, headers } = request;
    this.logger.log(`${method} ${path}`);
    const key = headers['x-api-key'] || null;

    // 是否在IP白名单
    const realIp = requestIp.getClientIp(request);
    const isDevelopment =
      process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'dev';
    const isLocalhost =
      realIp === '127.0.0.1' ||
      realIp === '::1' ||
      realIp === '::ffff:127.0.0.1';

    // 開發環境且是 localhost 則跳過 API key 檢查
    if (isDevelopment && isLocalhost) {
      return next.handle();
    }

    if (!this.sdkApiKeyService.isWhiteIp(realIp)) {
      const referer =
        request.headers.origin ||
        request.headers.referer ||
        request.headers.referrer;
      let refererHost;
      // console.log('ori request.headers', request.headers);

      // 檢查特殊情況：x-client-id 為 lootex
      const clientId = request.headers['x-client-id'];

      if (clientId === 'lootex' && key) {
        // console.log('ori request clientId', clientId);
        // 只需驗證 apiKey 是否合法
        // console.log('apiKey', apiKey);
        // console.log('process.env.FRONTEND_BASE_URL', process.env.FRONTEND_BASE_URL);
        if (
          this.sdkApiKeyService.validateApiKey(
            key,
            process.env.FRONTEND_BASE_URL.replace(/^https?:\/\//, ''),
          )
        ) {
          return next.handle();
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
        if (!key || !this.validateApikey(key, refererHost)) {
          // 如果不满足条件，抛出异常
          throw new BadRequestException(
            'Invalid request for API key parameter',
          );
        }
      }
    }

    return next.handle();
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
