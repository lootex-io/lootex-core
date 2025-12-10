import { BaseSqsService } from '@/core/base/sqs/baseSqs.service';
import { InjectModel } from '@nestjs/sequelize';
import { Wallet } from '@/model/entities';
import { ConfigurationService } from '@/configuration';
import { QueueService } from '@/external/queue/queue.service';
import { CacheService } from '@/common/cache';
import { Logger } from '@nestjs/common';
import { AWS_SQS_AGGREGATOR_EVENT_URL, QUEUE_ENV } from '@/common/utils';
import { OpenSeaHandlerService } from '@/core/aggregator-core/opensea/opensea-handler.service';

export class AggregatorEventTaskService extends BaseSqsService {
  constructor(
    @InjectModel(Wallet)
    private readonly walletRepository: typeof Wallet,

    public readonly configService: ConfigurationService,
    public readonly queueService: QueueService,
    public readonly cacheService: CacheService,
    public readonly handlerService: OpenSeaHandlerService,
  ) {
    super(
      new Logger(AggregatorEventTaskService.name),
      AWS_SQS_AGGREGATOR_EVENT_URL,
      QUEUE_ENV.QUEUE_AGGREGATOR_EVENT_EXPIRED,
      true,
    );
  }
  exeTask(options: { payload: any }): Promise<void> {
    // console.log('exeTask ', options.payload.action);
    setTimeout(() => {
      if (options.payload.action === 'fulfill') {
        for (const nft of options.payload.nfts) {
          // 区间： 前后1分钟内
          this.handlerService.checkAndRepairNFTs([
            {
              ...nft,
              startTime: Math.round(nft.fulfillStamp - 60),
              endTime: Math.round(nft.fulfillStamp + 60),
            },
          ]);
        }
      }
    }, 10 * 1000);
    return Promise.resolve(undefined);
  }

  getCacheKey(payload): string {
    return QueueService.payloadFifoKey(
      this.configService.get(AWS_SQS_AGGREGATOR_EVENT_URL),
      payload,
    );
  }
}
