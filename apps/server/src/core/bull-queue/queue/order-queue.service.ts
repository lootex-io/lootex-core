import { Injectable, Logger } from '@nestjs/common';
import { UpdateAssetOrderCategory } from '@/core/dao/asset-extra-dao';
import { SeaportOrder } from '@/model/entities';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QueueOrder } from '@/core/bull-queue/bull-queue.constant';
import { getCacheKey } from '@/common/decorator/cacheable.decorator';
import { sleep } from 'typescript-retry-decorator/dist/utils';

@Injectable()
export class OrderQueueService {
  private logger = new Logger(OrderQueueService.name);
  constructor(
    @InjectQueue(QueueOrder.name) private readonly orderQueue: Queue,
  ) {}

  /**
   * test
   */
  async testUpdateAssetBestOrder() {
    for (let i = 0; i < 4; i++) {
      if (i != 3) {
        await sleep(0);
      } else {
        // 最后一条
        await sleep(10000);
      }
      this.updateAssetBestOrder(
        '76da38be-273e-4ebe-8317-480712a90bd9',
        null,
        UpdateAssetOrderCategory.Listing,
      );
    }
  }

  async updateAssetBestOrder(
    assetId: string,
    order: SeaportOrder | null,
    type: UpdateAssetOrderCategory,
  ) {
    const jobId = getCacheKey(
      'AssetQueueService',
      'updateAssetBestOrder',
      [assetId, order, type],
      true,
    );
    // this.logger.log(`updateAssetBestOrder job ${jobId}`);
    const job = await this.orderQueue.getJob(jobId);

    const sendQueueJob = () => {
      const data = {
        assetId: assetId,
        order: order?.toJSON(),
        updateCategory: type,
        exeDate: new Date().toLocaleString(),
      };
      this.orderQueue.add(QueueOrder.process.updateBestOrder, data, {
        jobId: jobId,
      });
    };

    if (job) {
      const state = await job.getState();
      if (state === 'waiting' || state === 'delayed') {
        // job 还未执行，直接跳过 skip
        // this.logger.log(`skip job ${jobId} `);
        return;
      }
      job.finished().then((res) => {
        // this.logger.log(`wait finished and add job ${jobId} `);
        sendQueueJob();
      });
    } else {
      // this.logger.log(`add job ${jobId}`);
      sendQueueJob();
    }
  }
}
