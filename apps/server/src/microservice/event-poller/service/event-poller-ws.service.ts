import { Inject, Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import {
  SEAPORT_ABI,
  SeaportAddress,
  SupportedChains,
} from '@/microservice/event-poller/constants';
import { Chain, ChainMap } from '@/common/libs/libs.service';
import { ConfigurationService } from '@/configuration';
import { EventPollerService } from '@/microservice/event-poller/event-poller.service';
import { InjectModel } from '@nestjs/sequelize';
import { EventWssProgress } from '@/model/entities/event-wss-progress.entity';
import { EventRpcLog } from '@/model/entities/event-rpc-log.entity';
import { EventPollerHandlerService } from '@/microservice/event-poller/service/event-poller-handler.service';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize';
import { NODE_ENV, NODE_ENV_PRODUCTION } from '@/common/utils';
import { LOG_TYPE, LogService } from '@/core/log/log.service';

const WEBSOCKET_PING_INTERVAL = 60000;
const WEBSOCKET_PONG_TIMEOUT = 5000;
const WEBSOCKET_RECONNECT_DELAY = 100;

@Injectable()
export class EventPollerWsService {
  private readonly logger = new Logger(EventPollerWsService.name);

  constructor(
    @InjectModel(EventWssProgress)
    private readonly eventWssProgressRepository: typeof EventWssProgress,
    @InjectModel(EventRpcLog)
    private readonly eventRpcLogRepository: typeof EventRpcLog,
    @Inject(ProviderTokens.Sequelize)
    private readonly sequelizeInstance: Sequelize,

    private readonly configService: ConfigurationService,
    private readonly eventPollerService: EventPollerService,
    private readonly handlerService: EventPollerHandlerService,
    private logService: LogService,
  ) {
    // setTimeout(() => this.start(), 1000);
    // setTimeout(
    //   // () => this.connect(Chain.POLYGON, 'wss://polygon.gateway.tenderly.co'),
    //   // () => this.connect(Chain.POLYGON, 'wss://polygon-bor.publicnode.com'),
    //   () =>
    //     this.connect(
    //       Chain.POLYGON,
    //       'https://polygon-mainnet.blastapi.io/3a178446-5370-4a63-9fc3-0474e652e09e',
    //     ),
    //   1000,
    // ); // test
  }

  start() {
    const chainNames = Object.values(SupportedChains);
    for (const chainName of chainNames) {
      if (
        this.configService.get<string>(NODE_ENV) === NODE_ENV_PRODUCTION &&
        chainName === Chain.MUMBAI
      ) {
        this.logger.log(
          `NODE_ENV ${this.configService.get<string>(
            NODE_ENV,
          )} , ignore mumbai network`,
        );
        continue;
      }
      const rpcName = ChainMap[chainName].RPC;
      let rpcUrl = this.configService.get(`RPC_ENDPOINT_${rpcName}`);
      if (chainName === Chain.AVALANCHE.toString()) {
        rpcUrl = rpcUrl.replace('https', 'wss');
        rpcUrl = rpcUrl.replace('rpc', 'ws');
      } else if (chainName === Chain.MUMBAI) {
        rpcUrl =
          'wss://polygon-testnet.blastapi.io/f6d433d4-fe67-4ed4-80f1-dc758a72789a';
      } else {
        rpcUrl = rpcUrl.replace('https', 'wss');
      }
      this.connect(chainName, rpcUrl);
    }
  }

  connect(chainName: string, rpcUrl: string, options?: { retry: boolean }) {
    const chainId = +ChainMap[chainName].id;
    this.logger.debug(
      `connect ${chainName} ${(options?.retry ?? false) ? 'retry' : ''}`,
    );
    this.logger.debug(
      `chainId ${chainId} ${SeaportAddress[chainName]} rpcUrl ${rpcUrl}`,
    );
    const provider = new ethers.providers.WebSocketProvider(rpcUrl, chainId);
    const seaport = new ethers.Contract(
      SeaportAddress[chainName],
      SEAPORT_ABI,
      provider,
    );
    let pingInterval: NodeJS.Timer | undefined;
    let pongTimeout: NodeJS.Timeout | undefined;
    try {
      provider._websocket.on('open', async (o) => {
        this.logger.debug(`onopen ${chainId}`);
        const flag = await this.handleOnOpen(chainId);
        this.logger.debug(`onopen handleOnOpen ${flag}`);
        if (!flag) {
          this.logger.debug(`onopen ${chainId} handleOnOpen error`);
          return;
        }
        pingInterval = setInterval(() => {
          provider._websocket.ping();
          pongTimeout = setTimeout(() => {
            this.logger.debug(`${chainId} WEBSOCKET_PONG_TIMEOUT`);
            provider._websocket.terminate();
          }, WEBSOCKET_PONG_TIMEOUT);
        }, WEBSOCKET_PING_INTERVAL);
      });
      provider._websocket.on('error', async (e) => {
        this.logger.debug(`onerror ${chainId} message ${e.message}`);
      });
      provider._websocket.on('close', async (e) => {
        this.logger.debug(`onclose ${chainId}`);
        provider._wsReady = false;
        if (pingInterval) {
          // @ts-ignore
          clearInterval(pingInterval);
        }
        if (pongTimeout) {
          clearTimeout(pongTimeout);
        }
        // retry connect
        await provider._websocket.terminate();
        // await provider.destroy();
        await seaport.removeAllListeners(this.handlerService.eventFilter);
        setTimeout(
          () => this.connect(chainName, rpcUrl, { retry: true }),
          WEBSOCKET_RECONNECT_DELAY,
        );
      });
      provider._websocket.on('pong', async () => {
        this.logger.debug(`pong ${chainId}`);
        if (pongTimeout) {
          clearTimeout(pongTimeout);

          try {
            const currentTime = new Date();
            const blockNumber =
              await this.handlerService.getBlockNumber(chainId);
            if (blockNumber != null) {
              await this.eventWssProgressRepository.update(
                { endTime: currentTime.toISOString(), endBlock: blockNumber },
                {
                  where: { chain: chainId },
                },
              );
            }
          } catch (e) {}
        } else {
          try {
            const currentTime = new Date();
            const blockNumber =
              await this.handlerService.getBlockNumber(chainId);
            if (blockNumber != null) {
              const wssProgress = await this.eventWssProgressRepository.findOne(
                {
                  where: { chain: chainId },
                },
              );
              await this.eventWssProgressRepository.create({
                startTime: wssProgress.endTime,
                runningBlock: wssProgress.endTime,
                startBlock: wssProgress.endBlock,
                endTime: currentTime.toISOString(),
                endBlock: blockNumber,
              });
            }
          } catch (e) {}
        }
      });

      this.subscribeEvent(chainId, seaport);
    } catch (e) {
      this.logger.error(`connect ${e}`);
    }
  }

  async handleOnOpen(chainId: number) {
    const currentTime = new Date();
    const blockNumber = await this.handlerService.getBlockNumber(chainId);
    if (blockNumber != null) {
      const t = await this.sequelizeInstance.transaction();
      try {
        const [wssProgress, _] =
          await this.eventWssProgressRepository.findOrCreate({
            where: { chain: chainId },
            defaults: {
              chain: chainId,
              startTime: new Date().toISOString(),
              endTime: new Date().toISOString(),
              startBlock: blockNumber,
              endBlock: blockNumber,
            },
            transaction: t,
          });
        await this.eventRpcLogRepository.create(
          {
            chain: chainId,
            startTime: wssProgress.endTime,
            startBlock: wssProgress.endBlock,
            runningBlock: wssProgress.endBlock,

            endTime: currentTime.toISOString(),
            endBlock: blockNumber,
          },
          { transaction: t },
        );
        wssProgress.endTime = currentTime.toISOString();
        wssProgress.endBlock = blockNumber;
        await wssProgress.save({ transaction: t });

        await t.commit();
        return true;
      } catch (e) {
        await t.rollback();
        this.logger.error('error ', e);
      }
    }

    return false;
  }

  subscribeEvent(chainId: number, seaport: ethers.Contract) {
    this.logger.log(`subscribeEvent ${chainId}`);
    seaport.on(this.handlerService.eventFilter, (e) => {
      // console.log(`on-event ${chainId}  : `, e);
      const parsedEvent = seaport.interface.parseLog(e);
      const eventName = parsedEvent.name;
      this.logService.log(LOG_TYPE.RPC_EVENT_POLLER, 'ws-onEvent', {
        chainId,
        eventName,
        args: parsedEvent.args,
      });
      // const orderHash = parsedEvent.args.orderHash;
      // this.logger.debug(`eventName ${eventName} ${parsedEvent.args}`);
      this.eventPollerService.handleEvent(chainId, seaport, e);
    });
  }
}
