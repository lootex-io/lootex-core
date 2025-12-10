import { Injectable, Logger } from '@nestjs/common';
import { SupportedChains } from '@/microservice/event-poller/constants';
import { ChainMap } from '@/common/libs/libs.service';
import { EventPollerHandlerService } from '@/microservice/event-poller/service/event-poller-handler.service';
import { EventRpcLog } from '@/model/entities/event-rpc-log.entity';
import { InjectModel } from '@nestjs/sequelize';
import { EventWssProgress } from '@/model/entities/event-wss-progress.entity';
import { Cron } from '@nestjs/schedule';
import { EventPollerService } from '@/microservice/event-poller/event-poller.service';
import { ConfigurationService } from '@/configuration';
import { Op } from 'sequelize';

/**
 * event-wss 方式中断补齐工作，防止业务丢失
 */
@Injectable()
export class EventPollerRpcService {
  private readonly logger = new Logger(EventPollerRpcService.name);

  private readonly maxCatchBlockNumber;

  constructor(
    @InjectModel(EventWssProgress)
    private readonly eventWssProgressRepository: typeof EventWssProgress,
    @InjectModel(EventRpcLog)
    private readonly eventRpcLogRepository: typeof EventRpcLog,

    private handlerService: EventPollerHandlerService,
    private eventPollerService: EventPollerService,
    private readonly configService: ConfigurationService,
  ) {
    this.maxCatchBlockNumber = parseInt(
      this.configService.get('EVENT_POLLER_MAX_CATCH_BLOCK_NUMBER') ?? '200',
    );
  }

  /**
   * 每5分钟检测event_rpc_log表中中断记录
   * @param task
   */
  @Cron('0 */5 * * * *')
  handleCron() {
    this.exeTask();
  }

  async exeTask() {
    const chainNames = Object.values(SupportedChains);
    for (const chainName of chainNames) {
      const chainId = +ChainMap[chainName].id;
      const runningTasks = await this.eventRpcLogRepository.findAll({
        where: { chain: chainId, status: EventRpcLog.EVENT_STATUS_RUNNING },
      });
      if (!runningTasks || runningTasks.length < 5) {
        // 当前不超过5个运行中的任务时，可以启动新任务
        const task = await this.eventRpcLogRepository.findOne({
          where: { chain: chainId, status: EventRpcLog.EVENT_STATUS_INIT },
          order: [['end_time', 'desc']],
        });
        if (task) {
          this.startEventRpcTask(task);
        }
      }

      // 检测哪些处于running卡主的任务，reset. 判断标准：超过15分钟未修改的记录
      const sleepTasks = await this.eventRpcLogRepository.findAll({
        where: {
          chain: chainId,
          status: EventRpcLog.EVENT_STATUS_RUNNING,
          updatedAt: {
            [Op.lt]: new Date(
              new Date().getTime() - 15 * 60 * 1000,
            ).toISOString(),
          },
        },
        limit: 2,
      });
      if (sleepTasks && sleepTasks.length > 0) {
        this.logger.debug(
          `sleepTasks ${chainId}  ${JSON.stringify(sleepTasks)} `,
        );
        for (const sleepTask of sleepTasks) {
          sleepTask.status = EventRpcLog.EVENT_STATUS_INIT;
          await sleepTask.save();
        }
      }
    }
  }

  async startEventRpcTask(eventRpcLog: EventRpcLog) {
    // set status to running
    await this.updateEventRpc(eventRpcLog.id, {
      status: EventRpcLog.EVENT_STATUS_RUNNING,
    });

    if (eventRpcLog.startBlock < eventRpcLog.endBlock) {
      try {
        // 分页处理
        const totalBlocks = eventRpcLog.endBlock - eventRpcLog.runningBlock;
        const pageSize = this.maxCatchBlockNumber;
        const pages = Math.ceil(totalBlocks / pageSize);
        for (let page = 0; page < pages; page++) {
          const fromBlock = eventRpcLog.runningBlock + page * pageSize;
          let toBlock = eventRpcLog.runningBlock + (page + 1) * pageSize;
          toBlock =
            toBlock <= eventRpcLog.endBlock ? toBlock : eventRpcLog.endBlock;
          const [events, contract] = await this.handlerService.getEvents(
            eventRpcLog.chain,
            fromBlock,
            toBlock,
          );
          if (!contract) {
            throw new Error(`getEvents error ${fromBlock} ${toBlock}`);
          }
          const tasks = events.map(async (event) => {
            await this.eventPollerService.handleEvent(
              eventRpcLog.chain,
              contract,
              event,
            );
          });

          await Promise.all(tasks)
            .then(() => {
              this.updateEventRpc(eventRpcLog.id, {
                runningBlock: toBlock,
              });
            })
            .catch((err) => {
              this.logger.error(
                `chainId ${eventRpcLog.chain} Database Error: ${err.message}`,
              );
            });
        }
      } catch (err) {
        this.logger.warn(
          `chain ${eventRpcLog.chain} RPC Error: ${err.message}`,
        );
        return;
      }
    } else {
      this.logger.debug(`No need execute for ${JSON.stringify(eventRpcLog)}`);
    }

    // set status to done
    await this.updateEventRpc(eventRpcLog.id, {
      status: EventRpcLog.EVENT_STATUS_DONE,
    });
  }

  async updateEventRpc(id: string, values: any) {
    await this.eventRpcLogRepository.update(values, { where: { id } });
  }
}
