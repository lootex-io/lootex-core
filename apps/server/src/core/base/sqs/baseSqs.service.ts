import { Cron, Timeout } from '@nestjs/schedule';
import { ConfigurationService } from '@/configuration';
import { QueueService } from '@/external/queue/queue.service';
import { CacheService } from '@/common/cache';
import { Logger } from '@nestjs/common';
import * as promise from 'bluebird';
import { QUEUE_STATUS } from '@/common/utils';
import { Message } from '@aws-sdk/client-sqs';

/**
 *
 * */
export abstract class BaseSqsService {
  public configService: ConfigurationService;
  public queueService: QueueService;
  public cacheService: CacheService;

  protected constructor(
    protected logger: Logger,
    protected messageKey,
    protected queueExpiredKey,
    protected autoDeleteMessage = true,
    protected fifoSqs = true,
  ) {}

  abstract getCacheKey(payload): string;

  abstract exeTask(options: { payload: any; receiptHandle }): Promise<void>;

  async fetchMessageFromSqs() {
    let data: { Messages: Message[] | undefined };
    if (this.fifoSqs) {
      data = await this.queueService.receiveMessageFromFifoSqs(
        this.configService.get(this.messageKey),
      );
    } else {
      data = await this.queueService.receiveMessageFromSqs(
        this.configService.get(this.messageKey),
      );
    }

    if (!data?.Messages) {
      return promise.resolve();
    }

    await promise.map(data.Messages, async (message) => {
      this.logger.debug(`message = ${JSON.stringify(message)}`);
      if (this.autoDeleteMessage) {
        await this.queueService.deleteMessageFromSqs(
          this.configService.get(this.messageKey),
          message?.ReceiptHandle,
        );
      }
      await this.handlerMessage({
        payload: JSON.parse(message.Body),
        receiptHandle: message?.ReceiptHandle,
      });
    });
  }

  async handlerMessage(message: { payload; receiptHandle }) {
    const cacheKey = this.getCacheKey(message.payload);
    // this.logger.log(`handlerMessage cacheKey ${cacheKey}`);
    let existCache: any = await this.cacheService.getCache(cacheKey);
    // this.logger.debug(`handlerMessage ${JSON.stringify(existCache)}`);
    if (!existCache) {
      existCache = { queueStatus: QUEUE_STATUS.PENDING };
      // return;
    }

    if (
      existCache.queueStatus === QUEUE_STATUS.CONFIRM ||
      existCache.queueStatus === QUEUE_STATUS.RUNNING
    ) {
      this.logger.debug(
        `${this.messageKey} - ${JSON.stringify(
          existCache,
        )} queue is confirmed or running in other thread, skip`,
      );
      return;
    }

    if (existCache?.queueStatus === QUEUE_STATUS.PENDING) {
      await this.cacheService.setCache(
        cacheKey,
        {
          ...existCache,
          queueStatus: QUEUE_STATUS.RUNNING,
        },
        this.configService.get(this.queueExpiredKey),
      );
    }

    try {
      await this.exeTask(message);
    } catch (error) {
      this.logger.error(error);
    }

    await this.cacheService.setCache(
      cacheKey,
      {
        ...existCache,
        queueStatus: QUEUE_STATUS.CONFIRM,
      },
      this.configService.get(this.queueExpiredKey),
    );
  }

  @Cron('*/10 * * * * *')
  async handleCron() {
    await this.fetchMessageFromSqs();
  }

  @Timeout(0)
  async handleTimeout() {
    await this.fetchMessageFromSqs();
  }
}
