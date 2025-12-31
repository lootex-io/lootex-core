import { Injectable, Logger } from '@nestjs/common';

/**
 * RPC catch-up disabled after removing event rpc log entities.
 */
@Injectable()
export class EventPollerRpcService {
  private readonly logger = new Logger(EventPollerRpcService.name);

  handleCron() {
    this.logger.debug('event poller rpc catch-up is disabled');
  }
}
