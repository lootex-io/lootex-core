import {
  QueueAsset,
  QueueCollection,
  QueueOrder,
  QueueExplore,
  QueueBiruStore,
} from '@/core/bull-queue/bull-queue.constant';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QueueCollection.name },
      { name: QueueAsset.name },
      { name: QueueExplore.name },
      {
        name: QueueBiruStore.name,
        limiter: {
          max: 40, // 每秒最多处理 40 个任务
          duration: 1000, // 限制周期（毫秒）
        },
        defaultJobOptions: {
          removeOnComplete: true, // 成功任务自动删除
          removeOnFail: 5, // 仅保留 5 个失败任务
        },
      },
      {
        name: QueueOrder.name,
        limiter: {
          max: 40, // 每秒最多处理 40 个任务
          duration: 1000, // 限制周期（毫秒）
        },
        defaultJobOptions: {
          removeOnComplete: true, // 成功任务自动删除
          removeOnFail: 5, // 仅保留 5 个失败任务
        },
      },
    ),
  ],
  providers: [],
  exports: [BullModule], // 让其他模块可以复用
})
export class BullQueueModule {}
