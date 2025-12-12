import { Injectable } from '@nestjs/common';
import { GpPayTrackingService } from '@/microservice/tx-tracking/service/gp-pay/gp-pay-tracking.service';
import { ConfigurationService } from '@/configuration';

@Injectable()
export class TxTrackingIndexService {
  constructor(
    private readonly gpPayTrackingService: GpPayTrackingService,
    public readonly configService: ConfigurationService,
  ) { }

  async exeTask(options: { payload: any; receiptHandle }): Promise<void> {
    // SQS disabled, this should not be called via SQS anymore.
    const trackingType = options.payload?.type;
    const data: any = options.payload?.data;
    // Keep internal logic if invoked manually (though unlikely without SQS)
    // if (trackingType === TxTrackingType.GP_PAY) { ... }
    return Promise.resolve(undefined);
  }

  getCacheKey(payload): string {
    return 'disabled';
  }
}
