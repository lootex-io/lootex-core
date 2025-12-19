import { CacheService } from '@/common/cache';
import { Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PollerProgressProject } from '@/model/entities/poller-progress-project.entity';
import * as promise from 'bluebird';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';
import { ethers } from 'ethers-v6';
import { EventPollerDao } from '@/core/dao/event-poller.dao';

/**
 * 复制与BaseEventPollerService, 用于解决provider.getLogs逻辑。
 * 为了兼容支持多contract-address参数，采用ethers-v6
 */

export interface LogProject {
  name: string;
  chainId: number;
  pollingBatch: number;
  addresses: string[] | string;
}

export abstract class BaseLogPollerService {
  public cacheService: CacheService;
  protected topicFilter = [];
  protected debug = false;
  protected latestBlock = 0;

  @InjectModel(PollerProgressProject)
  private readonly pollerProgressProjectRepository: typeof PollerProgressProject;
  @Inject(RpcHandlerService)
  protected readonly rpcHandlerService: RpcHandlerService;
  @Inject(SchedulerRegistry)
  private readonly schedulerRegistry: SchedulerRegistry;
  @Inject(EventPollerDao)
  private readonly eventPollerDao: EventPollerDao;
  protected projects: LogProject[];
  protected latestBlockOffset = 0; // 真实读取区间(fromBlock, latestBlock - this.latestBlockOffset)

  // store task running status of every project
  private taskStatusMap = new Map<string, EventTaskStatus>();
  protected constructor(protected logger: Logger) {}

  async onModuleInit() {
    this.projects = this.onCreateEventProject();
    // 过滤掉 PollerProgressProject 表中不存在的project
    const data = [];
    for (const project of this.projects) {
      const p = await this.pollerProgressProjectRepository.findOne({
        where: { projectName: project.name },
      });
      if (p) {
        data.push(project);
      }
    }
    this.projects = data;
  }

  enableDebug(latestBlock: number) {
    this.debug = true;
    this.latestBlock = latestBlock;
  }

  abstract onCreateEventProject(): LogProject[];

  // async getLatestBlockNumber(seaport: ethers.Contract): Promise<number> {
  //   const block = await seaport.provider.getBlock(BLOCK_TAG);
  //   const blockNumber = block.number;
  //   return blockNumber;
  // }

  async getLastPolledBlockNumber(project: LogProject): Promise<number> {
    if (this.debug) {
      return this.latestBlock;
    }
    const pollerProgress = await this.pollerProgressProjectRepository.findOne({
      where: {
        projectName: project.name,
        chainId: project.chainId,
      },
    });

    return pollerProgress.lastPolledBlock;
  }

  async saveProgress(project: LogProject, lastPolledBlock: number) {
    if (this.debug) {
      this.latestBlock = lastPolledBlock;
      return;
    }
    const chainProgress = await this.pollerProgressProjectRepository.update(
      {
        lastPolledBlock: lastPolledBlock,
      },
      {
        where: {
          projectName: project.name,
          chainId: project.chainId,
        },
      },
    );
    return chainProgress;
  }

  setEvmPollTasks() {
    for (const project of this.projects) {
      const taskName = `POLLER_TASK_PROJECT_${project.name}`;
      const pollingInterval = 15000; // 15 seconds
      const evmPoll = this.evmPoll.bind(this);
      const pollerTaskId = setInterval(evmPoll, pollingInterval, project);
      this.schedulerRegistry.addInterval(taskName, pollerTaskId);
      this.logger.debug(
        `EventPoller setEvmPollTasks: Registered poller task for project ${project.name}`,
      );
    }
  }

  async evmPoll(project: LogProject) {
    if (this.getTaskStatus(project.name) === EventTaskStatus.Running) {
      this.logger.debug(
        `evmPoll ${project.name} task is running, skip this time.`,
      );
      return;
    }

    this.setTaskStatus(project.name, EventTaskStatus.Running);
    try {
      await this._evmPoll(project);
    } catch (e) {
    } finally {
      this.setTaskStatus(project.name, EventTaskStatus.Init);
    }
  }

  async _evmPoll(project: LogProject) {
    this.logger.debug(`evmPoll ${project.name}`);
    const { chainId } = project;
    let provider: ethers.JsonRpcProvider;
    try {
      provider = this.rpcHandlerService.createStaticJsonRpcProviderV6(
        chainId,
        RpcEnd.event,
      );
    } catch (e) {
      console.log(e);
    }

    let fromBlock: number;
    try {
      fromBlock = (await this.getLastPolledBlockNumber(project)) + 1;
    } catch (err) {
      console.log(err);
      this.logger.warn(
        `chainId ${chainId} ${project} getLastPolledBlockNumber Database Error: ${err.message}`,
      );
      return false;
    }

    if (!fromBlock) {
      this.logger.warn(
        `chainId ${chainId} poll: invalid fromBlock. Could result from failing call to DB`,
      );
      return;
    }

    let latestBlock: number;
    try {
      latestBlock = await this.eventPollerDao.getLatestBlockNumber(chainId);
      latestBlock = latestBlock - this.latestBlockOffset;
    } catch (err) {
      this.logger.warn(`chain ${chainId} RPC Error: ${err.message}`);
      this.rpcHandlerService.switchRpcIndex(chainId, RpcEnd.event);
      return;
    }

    if (!latestBlock || latestBlock < fromBlock) {
      this.logger.warn(
        `Project ${project.name} poll: invalid latestBlock[${latestBlock}]. Could result from failure of RPC endpoint`,
      );
      return false;
    }

    const toBlock =
      fromBlock + project.pollingBatch <= latestBlock
        ? fromBlock + project.pollingBatch
        : latestBlock;

    let logs: ethers.Log[];
    try {
      logs = await this.getLogs(project, provider, fromBlock, toBlock);
      // logs = await provider.getLogs({
      //   fromBlock: fromBlock,
      //   toBlock: toBlock,
      //   topics: this.topics,
      //   address: project.addresses,
      // });
    } catch (err) {
      this.logger.warn(`chain ${chainId} RPC Error: ${err.message}`);
      return;
    }

    if (logs.length === 0) {
      await this.saveProgress(project, toBlock);
      this.logger.debug(
        `chainId ${chainId} poll: Skip from Block ${fromBlock} to Block ${toBlock}`,
      );
      return;
    }
    this.logger.debug(
      `chainId ${chainId} poll: ${logs.length} polling events from Block ${fromBlock} to Block ${toBlock}`,
    );
    await promise
      .map(logs, (log) => this.handleLog(project, provider, log), {
        concurrency: 5,
      }) // 設定同時並行的數量
      .then(() => {
        this.saveProgress(project, toBlock);
        return;
      })
      .catch((err) => {
        this.logger.error(
          `${project.name}, Block ${fromBlock} to Block ${toBlock}, Database Error: ${err.message}`,
        );
        return;
      });
  }

  async getLogs(
    project: LogProject,
    provider: ethers.JsonRpcProvider,
    fromBlock: number,
    toBlock: number,
  ) {
    return await provider.getLogs({
      fromBlock: fromBlock,
      toBlock: toBlock,
      topics: this.topicFilter,
      address: project.addresses,
    });
  }

  abstract handleLog(
    project: LogProject,
    provider: ethers.JsonRpcProvider,
    log: ethers.Log,
  );

  getTaskStatus(name: string): EventTaskStatus {
    const status = this.taskStatusMap.get(name) || EventTaskStatus.Init;
    // this.logger.debug(`getTaskStatus chainId ${chainId} status ${status}`);
    return status;
  }

  setTaskStatus(name: string, status: EventTaskStatus) {
    return this.taskStatusMap.set(name, status);
  }
}

enum EventTaskStatus {
  Init,
  Running,
  Finished,
}
