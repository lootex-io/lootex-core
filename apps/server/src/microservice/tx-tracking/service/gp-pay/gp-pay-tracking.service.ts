import { Injectable, Logger } from '@nestjs/common';
import { TxTrackingGPPayData } from '@/microservice/tx-tracking/tx-tracking-constants';

/**
 * GP Pay 追踪： 过期 GP Pay 消费 退回
 * Stubbed due to removal of event-poller-gp
 */
@Injectable()
export class GpPayTrackingService {
  private logger = new Logger(GpPayTrackingService.name);
  constructor() { }

  async handleTrackingEvent(params: TxTrackingGPPayData) {
    this.logger.warn(`STUBBED: handleTrackingEvent called with ${JSON.stringify(params)}`);
    return;
  }
}
