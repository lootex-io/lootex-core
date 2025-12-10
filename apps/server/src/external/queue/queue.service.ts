import { Injectable, Logger } from '@nestjs/common';

import * as AWS from '@aws-sdk/client-sqs';
import { ConfigurationService } from '@/configuration/configuration.service';
import { CacheService } from '@/common/cache';
import { QUEUE_STATUS } from '@/common/utils';
import * as serialize from 'serialize-javascript';
import { createHash } from 'crypto';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private sqs;

  constructor(
    private readonly configService: ConfigurationService,
    private readonly cacheService: CacheService,
  ) {
    this.sqs = null;
  }

  async onModuleInit(): Promise<void> {
    this.sqs = new AWS.SQSClient({
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_ACCESS_KEY_SECRET'),
      },
      region: this.configService.get('AWS_SQS_REGION'),
    });
  }

  // push message to aws sqs
  async sendMessageToSqs(
    QueueUrl: string,
    payload: any,
    delaySecond = 0,
  ): Promise<void> {
    try {
      await this.sqs.send(
        new AWS.SendMessageCommand({
          MessageBody: JSON.stringify(payload),
          QueueUrl: QueueUrl,
          DelaySeconds: delaySecond,
        }),
      );
    } catch (e) {
      console.log(e);
    }
    return;
  }

  /**
   *
   * @param options
   */
  async sendMessageToSqsCacheable(options: {
    queueUrl: string;
    payload: Object;
    expiredTime: number;
    delaySecond: number; // second
  }) {
    // get your update data queue in cache
    const { queueUrl, payload, expiredTime } = options;
    const queueKey = QueueService.payloadKey(queueUrl, payload);
    const cacheData: any = await this.cacheService.getCache(queueKey);
    const queueStatus = cacheData?.queueStatus || QUEUE_STATUS.PENDING;
    if (cacheData) {
      return await this.cacheService.getCache(queueKey);
    }
    await this.sendMessageToSqs(queueUrl, payload, options.delaySecond | 0);
    await this.cacheService.setCache(
      queueKey,
      { ...payload, queueStatus },
      expiredTime,
    );
    return await this.cacheService.getCache(queueKey);
  }

  // get message from aws sqs
  async receiveMessageFromSqs(QueueUrl: string) {
    let message;
    try {
      message = await this.sqs.send(
        new AWS.ReceiveMessageCommand({
          VisibilityTimeout: 30,
          QueueUrl: QueueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20,
        }),
      );
    } catch (e) {
      console.log(e);
    }

    return message;
  }

  // delete message from aws sqs
  async deleteMessageFromSqs(
    QueueUrl: string,
    ReceiptHandle: string,
  ): Promise<void> {
    try {
      await this.sqs.send(
        new AWS.DeleteMessageCommand({
          QueueUrl,
          ReceiptHandle,
        }),
      );
    } catch (e) {
      console.log(e);
    }

    return;
  }

  /**
   * 整合检测 queueStatus
   * @param options
   */
  async sendMessageToFifoSqsCacheable(options: {
    queueUrl: string;
    payload: Object;
    expiredTime: number; // second
  }): Promise<{ payload: any; queueStatus: QUEUE_STATUS }> {
    // get your update data queue in cache
    const { queueUrl, payload, expiredTime } = options;
    const queueKey = QueueService.payloadFifoKey(queueUrl, payload);
    const cacheData: any = await this.cacheService.getCache(queueKey);
    const queueStatus = cacheData?.queueStatus || QUEUE_STATUS.PENDING;
    if (cacheData) {
      return await this.cacheService.getCache(queueKey);
    }
    await this.sendMessageToFifoSqs(queueUrl, payload);
    await this.cacheService.setCache(
      queueKey,
      { ...payload, queueStatus },
      expiredTime,
    );
    return await this.cacheService.getCache(queueKey);
  }

  /**
   * send message to fifo sqs
   * @param QueueUrl
   * @param payload
   */
  async sendMessageToFifoSqs(QueueUrl: string, payload: any): Promise<void> {
    try {
      await this.sqs.send(
        new AWS.SendMessageCommand({
          MessageBody: JSON.stringify(payload),
          QueueUrl: QueueUrl,
          MessageGroupId: 'onchain',
          MessageDeduplicationId: `${new Date().getTime()}`,
        }),
      );
    } catch (e) {
      console.log(e);
    }
    return;
  }

  async receiveMessageFromFifoSqs(QueueUrl: string) {
    let message;
    try {
      message = await this.sqs.send(
        new AWS.ReceiveMessageCommand({
          QueueUrl: QueueUrl,
          MaxNumberOfMessages: 5,
          VisibilityTimeout: 30,
          WaitTimeSeconds: 0,
        }),
      );
    } catch (e) {
      console.log(e);
    }

    return message;
  }

  static payloadFifoKey(url, payload) {
    let queueKey = serialize(payload);
    queueKey =
      'sqs-fifo-key:' +
      createHash('md5').update(url).digest('hex') +
      ':' +
      createHash('md5').update(queueKey).digest('hex');
    return queueKey;
  }

  static payloadKey(url: string, payload) {
    let queueKey = serialize(payload);
    queueKey =
      'sqs-key:' +
      createHash('md5').update(url).digest('hex') +
      ':' +
      createHash('md5').update(queueKey).digest('hex');
    return queueKey;
  }
}
