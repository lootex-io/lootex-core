import { Injectable, Logger } from '@nestjs/common';
import { EventType, OpenSeaStreamClient } from '@opensea/stream-js';
import { WebSocket } from 'ws';
import type { Channel, Socket } from 'phoenix';
import { LocalStorage } from 'node-localstorage';
import { ConfigurationService } from '@/configuration';
import { CacheService } from '@/common/cache';

@Injectable()
export class OpenseaWsSdkService {
  private readonly logger = new Logger(OpenseaWsSdkService.name);
  public client: OpenSeaStreamClient;

  private readonly apiKeys: string[] = [];
  private keyIndex = 0;
  private currentApiKey = '';
  constructor(
    private readonly configService: ConfigurationService,
    private readonly cacheService: CacheService,
  ) {
    this.apiKeys = this.configService.get<string>('OPENSEA_API_KEY').split(',');
  }

  getSocket(): Socket {
    // @ts-ignore
    return this.client.socket;
  }

  isConnected() {
    return this.getSocket().isConnected();
  }

  getChannels(): Map<string, Channel> {
    // @ts-ignore
    return this.client.channels;
  }

  start(collections: string[]) {
    this.currentApiKey = this.apiKeys[this.keyIndex % this.apiKeys.length];
    this.keyIndex = this.keyIndex + 1;
    this.logger.log(`start currentApiKey ${this.currentApiKey}`);
    const connect = () => {
      this.client = new OpenSeaStreamClient({
        token: this.currentApiKey,
        connectOptions: {
          transport: WebSocket,
          sessionStorage: LocalStorage,
        },
        onError: (error: ErrorEvent) => {
          // console.log(error);
          this.logger.error(`client onError ${error.message}`);
        },
      });
      this.getSocket().onClose((event) => {
        this.logger.error(
          `client.getSocket onClose ${event.code} ${event.reason}}`,
        );
      });

      for (const slug of collections) {
        this.client.onEvents(
          slug,
          [
            EventType.ITEM_LISTED,
            EventType.ITEM_CANCELLED,
            EventType.ITEM_SOLD,
            EventType.ITEM_TRANSFERRED,
          ],
          (event) => {
            // handle event
            console.log(`slug ${JSON.stringify(event)}`);
          },
        );
      }
    };
    if (this.client) {
      this.client.disconnect(() => connect());
    } else {
      connect();
    }
  }
}
