import { Injectable, Logger } from '@nestjs/common';

/**
 * WSS poller disabled after removing event progress entities.
 */
@Injectable()
export class EventPollerWsService {
  private readonly logger = new Logger(EventPollerWsService.name);

  start() {
    this.logger.debug('event poller ws is disabled');
  }
}
