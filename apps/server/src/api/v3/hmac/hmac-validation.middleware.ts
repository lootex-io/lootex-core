import {
  Injectable,
  HttpException,
  HttpStatus,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { NonceService } from '@/api/v3/hmac/nonce.service';
import { HmacService } from '@/api/v3/hmac/hmac.service';

@Injectable()
export class HmacValidationInterceptor implements NestInterceptor {
  private readonly hmacService: HmacService;

  constructor(
    hmacService: HmacService,
    private readonly nonceService: NonceService,
  ) {
    this.hmacService = hmacService;
  }
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const apiKey = req.headers['x-api-key'] || null;

    let message = req.body || null;
    if (!message.keyEncrypted || !message.encryptedData) {
      throw new HttpException(
        'Missing encryptKey, encryptedData, timestamp or nonce',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      message = JSON.parse(
        this.hmacService.parseRequestData(
          apiKey,
          message.keyEncrypted,
          message.encryptedData,
        ),
      );
    } catch (e) {
      throw new HttpException('Invalid request data', HttpStatus.BAD_REQUEST);
    }

    const nonce = message.nonce;
    const timestamp = message.timestamp;
    delete message.nonce;
    delete message.timestamp;
    req.body = message;

    if (!timestamp || !message) {
      throw new HttpException(
        'Missing timestamp or nonce',
        HttpStatus.BAD_REQUEST,
      );
    }
    // 检查 nonce 是否已使用
    const isNonceUsed = await this.nonceService.hasBeenUsed(nonce);
    if (isNonceUsed) {
      throw new HttpException(
        'Nonce has already been used',
        HttpStatus.BAD_REQUEST,
      );
    }
    // 检查时间戳是否过期（例如：5 分钟内）
    const currentTime = Date.now();
    if (Math.abs(currentTime - timestamp) > 5 * 60 * 1000) {
      throw new HttpException('Timestamp is too old', HttpStatus.BAD_REQUEST);
    }

    // 存储 nonce，防止重放攻击
    await this.nonceService.markAsUsed(nonce);
    return next.handle();
  }
}
