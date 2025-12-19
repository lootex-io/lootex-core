import { CacheService } from '@/common/cache';
import { Inject, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { InjectModel } from '@nestjs/sequelize';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PollerProgressProject } from '@/model/entities/poller-progress-project.entity';
import { EventPollerDao } from '@/core/dao/event-poller.dao';
import * as promise from 'bluebird';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';

export interface EventProject {
  name: string;
  chainId: number;
  contractAddress: string;
  abi: any;
  pollingBatch: number;
}

export abstract class BaseEventPollerService {
  public cacheService: CacheService;
  protected eventFilter: ethers.EventFilter;

  @InjectModel(PollerProgressProject)
  private readonly pollerProgressProjectRepository: typeof PollerProgressProject;
  @Inject(RpcHandlerService)
  protected readonly rpcHandlerService: RpcHandlerService;
  @Inject(SchedulerRegistry)
  private readonly schedulerRegistry: SchedulerRegistry;
  @Inject(EventPollerDao)
  protected readonly eventPollerDao: EventPollerDao;
  protected projects: EventProject[];
  protected debug = false;
  protected latestBlock = 0;
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

  abstract onCreateEventProject();

  // async getLatestBlockNumber(seaport: ethers.Contract): Promise<number> {
  //   const block = await seaport.provider.getBlock(BLOCK_TAG);
  //   const blockNumber = block.number;
  //   return blockNumber;
  // }

  enableDebug(latestBlock: number) {
    this.debug = true;
    this.latestBlock = latestBlock;
  }

  async getLastPolledBlockNumber(project: EventProject): Promise<number> {
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

  async saveProgress(project: EventProject, lastPolledBlock: number) {
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

  async evmPoll(project: EventProject) {
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

  async _evmPoll(project: EventProject) {
    this.logger.debug(`evmPoll ${project.name}`);
    const { chainId } = project;
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      RpcEnd.event,
    );
    const projectContract = new ethers.Contract(
      project.contractAddress,
      project.abi,
      provider,
    );

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

    let events: ethers.Event[];
    try {
      events = await this.queryFilter(
        chainId,
        projectContract,
        fromBlock,
        toBlock,
      );
      // events = await this.eventPollerDao.queryFilter({
      //   chainId: chainId,
      //   contract: projectContract,
      //   eventFilter: this.eventFilter,
      //   fromBlock: fromBlock,
      //   toBlock: toBlock,
      // });
    } catch (err) {
      this.logger.warn(`chain ${chainId} RPC Error: ${err.message}`);
      return;
    }

    if (events.length === 0) {
      await this.saveProgress(project, toBlock);
      this.logger.debug(
        `chainId ${chainId} poll: Skip from Block ${fromBlock} to Block ${toBlock}`,
      );
      return;
    }
    this.logger.debug(
      `chainId ${chainId} poll: ${events.length} Airdrop events from Block ${fromBlock} to Block ${toBlock}`,
    );
    await promise
      .map(
        events,
        (event) => this.handleEvent(project, projectContract, event),
        {
          concurrency: 5,
        },
      ) // 設定同時並行的數量
      .then(() => {
        this.saveProgress(project, toBlock);
        return;
      })
      .catch((err) => {
        console.log('err ', err);
        this.logger.error(
          `${project.name}, Block ${fromBlock} to Block ${toBlock}, Database Error: ${err.message}`,
        );
        return;
      });
  }

  async queryFilter(
    chainId: number,
    projectContract: ethers.Contract,
    fromBlock: number,
    toBlock: number,
  ) {
    return await this.eventPollerDao.queryFilter({
      chainId: chainId,
      contract: projectContract,
      eventFilter: this.eventFilter,
      fromBlock: fromBlock,
      toBlock: toBlock,
    });
  }

  abstract handleEvent(
    project: EventProject,
    seaport: ethers.Contract,
    event: ethers.Event,
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
