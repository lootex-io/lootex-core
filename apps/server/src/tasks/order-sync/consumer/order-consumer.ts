import { Process, Processor } from '@nestjs/bull';
import { QueueOrder } from '@/core/bull-queue/bull-queue.constant';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { AssetExtraDao } from '@/core/dao/asset-extra-dao';

@Processor(QueueOrder.name)
export class OrderConsumer {
  private logger = new Logger(OrderConsumer.name);
  constructor(private readonly assetExtraDao: AssetExtraDao) {
    this.logger.log('OrderConsumer constructor');
  }

  @Process(QueueOrder.process.updateBestOrder)
  async updateBestOrder(job: Job<any>) {
    this.logger.debug(
      `updateBestOrder jobId: ${job.id} Start. data: ${JSON.stringify(job.data)}`,
    );
    const { assetId, order, updateCategory } = job.data;

    // await sleep(3000); // 3 seconds
    return this.assetExtraDao.updateAssetExtraBestOrderByAssetId(
      assetId,
      order,
      updateCategory,
    );
    // this.logger.log(`updateBestOrder jobId: ${job.id} End.`);
  }
}
