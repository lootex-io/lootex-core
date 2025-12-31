import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';

/**
 * 搜索引擎爬蟲檢測守衛 (Stubbed)
 */
@Injectable()
export class BotDetectionGuard implements CanActivate {
  private readonly logger = new Logger(BotDetectionGuard.name);

  constructor() { }

  canActivate(context: ExecutionContext): boolean {
    return true; // Always allow
  }
}
