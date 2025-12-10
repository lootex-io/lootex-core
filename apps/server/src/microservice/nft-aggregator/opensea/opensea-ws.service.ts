import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationService } from '@/configuration/configuration.service';
import { WebSocket } from 'ws';
import {
  AGGREGATOR_WEBSOCKET_PING_INTERVAL,
  AGGREGATOR_WEBSOCKET_PONG_TIMEOUT,
  AGGREGATOR_WEBSOCKET_RECONNECT_DELAY,
  OPENSEA_EVENT_TYPE,
} from '@/microservice/nft-aggregator/aggregator-constants';
import { OpenSeaHandlerService } from '@/core/aggregator-core/opensea/opensea-handler.service';
import { InjectModel } from '@nestjs/sequelize';
import { AggregatorOpenSeaRepairLog } from '@/model/entities/aggregator/aggregator-opensea-repair-log';
import { AggregatorWssProgress } from '@/model/entities/aggregator/aggregator-wss-progress';
import { NODE_ENV } from '@/common/utils';
import { CacheService } from '@/common/cache';

@Injectable()
export class OpenseaWsService {
  static WSS_NAME = 'opensea';
  private readonly logger = new Logger(OpenseaWsService.name);
  private eventFilters = [
    OPENSEA_EVENT_TYPE.ITEM_LISTED,
    OPENSEA_EVENT_TYPE.ITEM_SOLD,
    OPENSEA_EVENT_TYPE.ITEM_TRANSFERRED,
    OPENSEA_EVENT_TYPE.ITEM_CANCELLED,
  ];

  public wsClient: WebSocket;

  // 时间戳的形式，单位 s
  private lastTime = 0;

  public collections: string[] = [];

  private openSeaWssUrl: string = '';
  private watchedCollections = [];
  private apiKeys: string[] = [];
  private wssBaseUrl: string = '';
  private keyIndex = 0;
  private currentApiKey = '';

  constructor(
    @InjectModel(AggregatorOpenSeaRepairLog)
    private readonly openSeaRepairRepository: typeof AggregatorOpenSeaRepairLog,
    @InjectModel(AggregatorWssProgress)
    private readonly wssProgressRepository: typeof AggregatorWssProgress,
    private readonly handlerService: OpenSeaHandlerService,
    private readonly configService: ConfigurationService,
    private readonly cacheService: CacheService,
  ) {
    this.apiKeys = this.configService.get<string>('OPENSEA_API_KEY').split(',');
    this.wssBaseUrl = this.configService.get<string>('OPENSEA_WSS_URL');
  }

  /**
   *
   */
  async reloadCollection(init = false) {
    // this.logger.debug('handleReloadCollectionCron');
    const _collections = await this.handlerService.reloadCollections();
    if (init) {
      this.collections = _collections;
    } else {
      // 删除新collections中不存在的slug
      const deleteCollections = this.collections.filter(
        (e) => _collections.indexOf(e) === -1,
      );
      // 新增旧collections中不存在的slug
      const insertCollections = _collections.filter(
        (e) => this.collections.indexOf(e) === -1,
      );

      this.logger.debug(
        `handleReloadCollectionCron deleteCollections ${deleteCollections}, insertCollections ${insertCollections}, collections ${this.collections}`,
      );
      const inserted = [];
      if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
        for (const slug of deleteCollections) {
          this.unSubscribeSlug(slug);

          // remove this slug
          const index = this.collections.indexOf(slug);
          this.collections.splice(index, 1);
        }
        for (const slug of insertCollections) {
          this.subscribeSlug(slug);

          // add this slug
          this.collections.push(slug);
          inserted.push(slug);
        }
        await this.updateWssStatusCache();
      } else {
        this.logger.log(
          `handleReloadCollectionCron websocket.state ${this.wsClient?.readyState}`,
        );
        // reconnect
        const opened = this.wsClient?.readyState == WebSocket.OPEN;
        if (!opened) {
          if (this.wsClient) {
            this.wsClient.terminate();
          }
        }
      }
      this.logger.debug(`handleReloadCollectionCron inserted ${inserted}`);
      return inserted;
    }
  }

  async updateWssStatusCache() {
    const status = {
      // wssUrl: this.openSeaWssUrl,
      wssState: this.getWssStateStr(),
      collections: this.watchedCollections,
    };
    await this.cacheService.setCache(
      'aggregator:opensea:wss:status',
      status,
      3600,
    );
  }

  subscribeSlug(slug: string) {
    this.logger.debug(`subscribe collection ${slug}`);
    if (this.watchedCollections.indexOf(slug) === -1) {
      this.watchedCollections.push(slug);
    }
    this.wsClient?.send(
      JSON.stringify({
        topic: `collection:${slug}`,
        event: 'phx_join',
        payload: {},
        ref: 0,
      }),
    );
  }

  unSubscribeSlug(slug: string) {
    this.logger.debug(`unsubscribe collection ${slug}`);
    const index = this.watchedCollections.indexOf(slug);
    if (index !== -1) {
      this.watchedCollections.splice(index, 1);
    }
    this.wsClient?.send(
      JSON.stringify({
        topic: `collection:${slug}`,
        event: 'phx_leave',
        payload: {},
        ref: 0,
      }),
    );
  }

  start() {
    if (this.collections && this.collections.length > 0) {
      this.currentApiKey = this.apiKeys[this.keyIndex % this.apiKeys.length];
      this.openSeaWssUrl = `${this.wssBaseUrl}?token=${this.currentApiKey}`;
      this.keyIndex = this.keyIndex + 1;
      this.logger.log(`openSeaWssUrl ${this.openSeaWssUrl}`);
      this.wsClient = new WebSocket(this.openSeaWssUrl);
      let pingInterval: NodeJS.Timer | undefined;
      let pongTimeout: NodeJS.Timeout | undefined;
      this.wsClient.on('open', () => {
        this.logger.log(`onOpen(${this.wsClient.readyState})`);
        this.lastTime = new Date().getTime() / 1000;
        //
        for (const collection of this.collections) {
          this.subscribeSlug(collection);
        }
        this.updateWssStatusCache();
        pingInterval = setInterval(() => {
          this.wsClient.ping(
            JSON.stringify({
              topic: 'phoenix',
              event: 'heartbeat',
              payload: {},
              ref: 0,
            }),
          );
          pongTimeout = setTimeout(() => {
            this.logger.debug(`AGGREGATOR_WEBSOCKET_PONG_TIMEOUT`);
            this.wsClient.terminate();
          }, AGGREGATOR_WEBSOCKET_PONG_TIMEOUT);
        }, AGGREGATOR_WEBSOCKET_PING_INTERVAL);

        this.checkOpenAndRepairLog();
      });

      this.wsClient.on('message', (message) => {
        const eventType = JSON.parse(message.toString()).event;
        if (this.eventFilters.indexOf(eventType) > -1) {
          const payload = JSON.parse(message.toString()).payload;
          // console.log('Received: %s', JSON.stringify(payload));
          this.handlerService.handlerEvent(eventType, payload.payload);
        }
      });

      this.wsClient.on('close', () => {
        this.logger.log(
          `Disconnected from WebSocket server(${this.wsClient.readyState}), reconnect ...`,
        );
        if (pingInterval) {
          // @ts-ignore
          clearInterval(pingInterval);
        }
        if (pongTimeout) {
          clearTimeout(pongTimeout);
        }
        this.createRepairLog(
          this.lastTime,
          new Date().getTime() / 1000,
          this.currentApiKey,
        );
        setTimeout(() => this.start(), AGGREGATOR_WEBSOCKET_RECONNECT_DELAY);
      });

      this.wsClient.on('error', (err) => {
        this.logger.error(
          `WebSocket encountered an error(${this.wsClient.readyState}):`,
          err,
        );
      });

      this.wsClient.on('pong', () => {
        this.logger.debug('pong');
        this.lastTime = new Date().getTime() / 1000;
        this.wssProgressRepository.update(
          { endTime: Math.floor(this.lastTime) },
          {
            where: { name: OpenseaWsService.WSS_NAME },
          },
        );
        // wsClient alive
        if (pongTimeout) {
          clearTimeout(pongTimeout);
        }
      });
    }
  }

  /**
   * 检测WebSocket状态，如果30s内非正常，警报
   */
  async checkWebSocketState() {
    if (!this.wsClient) {
      this.logger.error('checkWebSocketState wsClient is null');
      return;
    }
    if (this.wsClient && this.wsClient.readyState != WebSocket.OPEN) {
      setTimeout(async () => {
        if (this.wsClient.readyState != WebSocket.OPEN) {
          const stateStr = this.getWssStateStr();
          const message = [
            `Aggregator WebSocket [${this.configService.get<string>(NODE_ENV)}] :alert:`,
            `WebSocket State: ${stateStr}`,
            `Time: ${new Date()}`,
          ].join('\n');

          // reconnect
          if (this.wsClient) {
            this.wsClient.terminate();
          }
        }
      }, 30000);
    }
  }

  getWssStateStr() {
    let stateStr = '';
    switch (this.wsClient.readyState) {
      case WebSocket.CONNECTING:
        stateStr = 'CONNECTING';
        break;
      case WebSocket.OPEN:
        stateStr = 'OPEN';
        break;
      case WebSocket.CLOSING:
        stateStr = 'CLOSING';
        break;
      case WebSocket.CLOSED:
        stateStr = 'CLOSED';
        break;
      default:
        stateStr = this.wsClient.readyState + '';
    }
    return stateStr;
  }

  /**
   * 检测wss open事件，创建相应的repair log
   */
  async checkOpenAndRepairLog() {
    const currentTime = Math.floor(new Date().getTime() / 1000);
    const wssProgress = await this.wssProgressRepository.findOne({
      where: { name: OpenseaWsService.WSS_NAME },
    });
    if (wssProgress) {
      if (wssProgress.endTime < currentTime) {
        await this.createRepairLog(
          wssProgress.endTime,
          currentTime,
          this.currentApiKey,
        );
        wssProgress.endTime = currentTime;
        await wssProgress.save();
      }
    } else {
      await this.wssProgressRepository.create({
        name: OpenseaWsService.WSS_NAME,
        startTime: currentTime,
        endTime: currentTime,
      });
    }
  }

  async createRepairLog(startTime: number, endTime: number, apiKey: string) {
    if (startTime > 0 && endTime > 0) {
      const offset = 5; // 10s 误差

      let finalStartTime = Math.floor(startTime);
      const finalEndTime = Math.floor(endTime + offset);
      // 处理多次触发wss中断信号，避免重复创建修复记录
      const lastCollection = await this.openSeaRepairRepository.findOne({
        order: [['start_time', 'DESC']],
      });
      if (lastCollection) {
        if (endTime <= lastCollection.endTime) {
          // 如果endTime小于上次endTime，不需要创建
          // skip
          this.logger.debug(
            'createRepairLog endTime <= lastCollection.endTime skip',
          );
          return;
        } else {
          if (finalStartTime <= lastCollection.endTime) {
            // 如果finalStartTime 小于上次endTime
            finalStartTime = lastCollection.endTime + 1;
          }
        }
      }
      await this.openSeaRepairRepository.create({
        startTime: finalStartTime,
        endTime: finalEndTime,
        status: AggregatorOpenSeaRepairLog.EVENT_STATUS_INIT,
        type: 'ws',
        apiKey: apiKey,
      });
    }
  }
}
