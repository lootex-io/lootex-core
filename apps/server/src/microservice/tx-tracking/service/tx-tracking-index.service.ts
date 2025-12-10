import { Injectable, Logger } from '@nestjs/common';
import { BaseSqsService } from '@/core/base/sqs/baseSqs.service';
import { AWS_SQS_TX_TRACKING_URL, QUEUE_ENV } from '@/common/utils';
import { QueueService } from '@/external/queue/queue.service';
import { TxTrackingType } from '@/microservice/tx-tracking/tx-tracking-constants';
import { GpPayTrackingService } from '@/microservice/tx-tracking/service/gp-pay/gp-pay-tracking.service';
import { ConfigurationService } from '@/configuration';
import { CacheService } from '@/common/cache';

@Injectable()
export class TxTrackingIndexService extends BaseSqsService {
  constructor(
    private readonly gpPayTrackingService: GpPayTrackingService,
    public readonly configService: ConfigurationService,
    public readonly queueService: QueueService,
    public readonly cacheService: CacheService,
  ) {
    super(
      new Logger(TxTrackingIndexService.name),
      AWS_SQS_TX_TRACKING_URL,
      QUEUE_ENV.AWS_TX_TRACKING_EXPIRED,
      false, // 设置message处理完后手动删除
      false, // 非 fifo 队列
    );
  }
  async exeTask(options: { payload: any; receiptHandle }): Promise<void> {
    const trackingType = options.payload.type;
    const data: any = options.payload.data;
    if (trackingType === TxTrackingType.GP_PAY) {
      await this.gpPayTrackingService.handleTrackingEvent(data);
    }
    await this.queueService.deleteMessageFromSqs(
      this.configService.get(this.messageKey),
      options.receiptHandle,
    );
    return Promise.resolve(undefined);
  }

  getCacheKey(payload): string {
    return QueueService.payloadKey(
      this.configService.get(AWS_SQS_TX_TRACKING_URL),
      payload,
    );
  }
}
