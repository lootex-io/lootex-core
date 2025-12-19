import { CacheService } from '@/common/cache';
import { Inject, Logger } from '@nestjs/common';
import { ethers } from 'ethers-v6';
import { InjectModel } from '@nestjs/sequelize';
import { Asset, AssetAsEthAccount } from '@/model/entities';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PollerProgressProject } from '@/model/entities/poller-progress-project.entity';
import { EventPollerDao } from '@/core/dao/event-poller.dao';
import * as promise from 'bluebird';
import { ERC_1155_ABI, ERC_721_ABI } from './constants';
import { AssetService } from '@/api/v3/asset/asset.service';
import { AssetDao } from '@/core/dao/asset-dao';
import { ChainId } from '@/common/utils/types';
import { LibsService } from '@/common/libs/libs.service';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';
import { ConfigurationService } from '@/configuration';
import { ContractType } from '@/common/utils';

export interface EventProject {
  name: string;
  chainId: number;
  abi: any;
  pollingBatch: number;
}

export class EventPollerNftTransferService {
  // chainId(map) -> ContractType(map) -> contractAddress(set)
  private chainIdToBlockCollectionMap: Map<
    number,
    Map<ContractType, Set<string>>
  > = new Map();

  // chainId(number) -> contractAddress(Set<string>)
  // If a chainId exists in this map, ONLY contracts in the Set will be processed.
  // If a chainId does NOT exist in this map, ALL contracts are processed (default behavior).
  private chainIdToWhitelistMap: Map<number, Set<string>> = new Map();

  public cacheService: CacheService;
  private readonly logger = new Logger(EventPollerNftTransferService.name);

  constructor(
    private readonly assetService: AssetService,

    private readonly assetDao: AssetDao,

    private readonly libService: LibsService,


    private readonly configService: ConfigurationService,

    @InjectModel(Asset)
    private readonly assetRepository: typeof Asset,

    @InjectModel(AssetAsEthAccount)
    private readonly assetAsEthAccountRepository: typeof AssetAsEthAccount,

    @InjectModel(PollerProgressProject)
    private readonly pollerProgressProjectRepository: typeof PollerProgressProject,

    @Inject(RpcHandlerService)
    readonly rpcHandlerService: RpcHandlerService,

    @Inject(SchedulerRegistry)
    private readonly schedulerRegistry: SchedulerRegistry,

    @Inject(EventPollerDao)
    private readonly eventPollerDao: EventPollerDao,
  ) {
    // 初始化 Map 結構
    this.chainIdToBlockCollectionMap.set(1868, new Map());
    this.chainIdToBlockCollectionMap
      .get(1868)
      .set(ContractType.ERC721, new Set());

    this.chainIdToBlockCollectionMap
      .get(1868)
      .get(ContractType.ERC721)
      .add('0x1e807efc2416c6cd63cb3b01dc91232d6f02d50a');

    // name: 'Entertainment Robot aibo by Sony',
    // reason: 'too many events, have 20000000+ events',

    // Init Whitelist for Soneium
    this.chainIdToWhitelistMap.set(1868, new Set());

    // Load from ENV
    const soneiumWhitelist = this.configService.get('NFT_POLLER_WHITELIST_SONEIUM');
    if (soneiumWhitelist) {
      const addresses = soneiumWhitelist.split(',').map(addr => addr.trim().toLowerCase()).filter(addr => addr.length > 0);
      addresses.forEach(addr => this.chainIdToWhitelistMap.get(1868).add(addr));
      this.logger.log(`Loaded ${addresses.length} whitelisted contracts for Soneium from ENV.`);
    } else {
      this.logger.warn(`No whitelist configured for Soneium (NFT_POLLER_WHITELIST_SONEIUM). Poller will skip all events.`);
    }
  }

  projects: EventProject[] = [
    // {
    //   name: 'NFT_Transfer_Ethereum',
    //   chainId: 1,
    //   abi: [ERC_721_ABI, ERC_1155_ABI],
    //   pollingBatch: 10,
    // },
    // {
    //   name: 'NFT_Transfer_Bsc',
    //   chainId: 56,
    //   abi: [ERC_721_ABI, ERC_1155_ABI],
    //   pollingBatch: 10,
    // },
    // {
    //   name: 'NFT_Transfer_Polygon',
    //   chainId: 137,
    //   abi: [ERC_721_ABI, ERC_1155_ABI],
    //   pollingBatch: 10,
    // },
    // {
    //   name: 'NFT_Transfer_Avalanche',
    //   chainId: 43114,
    //   abi: [ERC_721_ABI, ERC_1155_ABI],
    //   pollingBatch: 10,
    // },
    // {
    //   name: 'NFT_Transfer_Arbitrum',
    //   chainId: 42161,
    //   abi: [ERC_721_ABI, ERC_1155_ABI],
    //   pollingBatch: 10,
    // },
    // {
    //   name: 'NFT_Transfer_Mantle',
    //   chainId: 5000,
    //   abi: [ERC_721_ABI, ERC_1155_ABI],
    //   pollingBatch: 10,
    // },
    {
      name: 'NFT_Transfer_Soneium',
      chainId: 1868,
      abi: [ERC_721_ABI, ERC_1155_ABI],
      pollingBatch: 10,
    },
    // {
    //   name: 'NFT_Transfer_Soneium_Minato',
    //   chainId: 1946,
    //   abi: [ERC_721_ABI, ERC_1155_ABI],
    //   pollingBatch: 10,
    // },
  ];

  // 定義 Transfer 事件的 topics
  ERC721_TRANSFER_TOPIC = ethers.keccak256(
    ethers.toUtf8Bytes('Transfer(address,address,uint256)'),
  );
  ERC1155_TRANSFER_SINGLE_TOPIC = ethers.keccak256(
    ethers.toUtf8Bytes(
      'TransferSingle(address,address,address,uint256,uint256)',
    ),
  );
  ERC1155_TRANSFER_BATCH_TOPIC = ethers.keccak256(
    ethers.toUtf8Bytes(
      'TransferBatch(address,address,address,uint256[],uint256[])',
    ),
  );

  // 設置過濾器，針對全網（不指定合約地址）
  eventFilter = {
    // fromBlock: fromBlock,
    // toBlock: toBlock,
    topics: [
      [
        this.ERC721_TRANSFER_TOPIC,
        this.ERC1155_TRANSFER_SINGLE_TOPIC,
        this.ERC1155_TRANSFER_BATCH_TOPIC,
      ],
    ],
  };
  latestBlockOffset = 0; // 真实读取区间(fromBlock, latestBlock - this.latestBlockOffset)

  // store task running status of every project
  private taskStatusMap = new Map<string, EventTaskStatus>();

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

    // TODO: for test
    this.sendSyncAssetToQueue({
      contractAddress: '0xaef0a409f8ff76b430411dbf4ce3c4622d4aafe1',
      tokenId: '1',
      chainId: '1868',
    });
  }

  onCreateEventProject() {
    this.latestBlockOffset = 1;

    return this.projects;
  }

  // async getLatestBlockNumber(seaport: ethers.Contract): Promise<number> {
  //   const block = await seaport.provider.getBlock(BLOCK_TAG);
  //   const blockNumber = block.number;
  //   return blockNumber;
  // }

  async getLastPolledBlockNumber(project: EventProject): Promise<number> {
    const pollerProgress = await this.pollerProgressProjectRepository.findOne({
      where: {
        projectName: project.name,
        chainId: project.chainId,
      },
    });

    return pollerProgress.lastPolledBlock;
  }

  async saveProgress(project: EventProject, lastPolledBlock: number) {
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
      const pollingInterval = 5000; // 5 seconds
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
    const provider = this.rpcHandlerService.createStaticJsonRpcProviderV6(
      chainId,
      RpcEnd.event,
    );
    // const provider = ethers.Rpc
    // const projectContract = new ethers.Contract(
    //   project.contractAddress,
    //   project.abi,
    //   provider,
    // );

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

    // let events: ethers.Event[];
    let events: Array<ethers.Log>;
    try {
      events = await provider.getLogs({
        fromBlock: fromBlock,
        toBlock: toBlock,
        topics: this.eventFilter.topics,
      });
      // events = await this.eventPollerDao.queryFilter({
      //   chainId: chainId,
      //   contract: projectContract,
      //   eventFilter: this.eventFilter,
      //   fromBlock: fromBlock,
      //   toBlock: toBlock,
      // });
      // events = await projectContract.queryFilter(
      //   this.eventFilter,
      //   fromBlock,
      //   toBlock,
      // );
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
      .map(events, (event) => this.handleEvent(project, event), {
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

  async handleEvent(project: EventProject, event: ethers.Log) {
    // console.log('event ', event);
    try {
      const contractAddress = event.address.toLowerCase();

      // Priority 0: Whitelist Check
      // If whitelist map has this chainId, we MUST check if contract is in the set
      if (this.chainIdToWhitelistMap.has(project.chainId)) {
        const whitelist = this.chainIdToWhitelistMap.get(project.chainId);
        if (!whitelist.has(contractAddress)) {
          // ensure project.chainId is correct (sometimes project obj reused? safer to perform check)
          // actually this.handleEvent param 'project' comes from 'evmPoll'
          // and event comes from provider.getLogs.
          // In _evmPoll we use 'project.chainId'.
          // So it's safe to assume correct chain context.

          // Log verbose if needed, but for performance, just return silently or debug log
          // this.logger.debug(`Skipping non-whitelisted contract ${contractAddress} on chain ${project.chainId}`);
          return;
        }
      }

      if (
        event.topics[0] === this.ERC721_TRANSFER_TOPIC &&
        event.data == '0x'
      ) {
        // 判斷黑名單
        project.chainId = 1868; // Hardcode warning? project.chainId from param should be prioritized if dynamic
        // But original code hardcoded it for Soneium blacklist check.
        // Let's keep original logic structure but respect whitelist first.

        if (
          this.chainIdToBlockCollectionMap
            .get(project.chainId)
            ?.get(ContractType.ERC721)
            ?.has(contractAddress)
        ) {
          return;
        }

        return this.handleERC721Transfer(project, event);
      }

      if (event.topics[0] === this.ERC1155_TRANSFER_SINGLE_TOPIC) {
        return this.handleERC1155TransferSingle(project, event);
      }

      if (event.topics[0] === this.ERC1155_TRANSFER_BATCH_TOPIC) {
        return this.handleERC1155TransferBatch(project, event);
      }
    } catch (err) {
      this.logger.error(`handleEvent Error: ${event} ${err.message}`);
    }
  }
  /**
   * 如果是 mint 事件(from 0x000...0)，則創建新 asset
   * 如果是一般的 transfer 事件，則更新 asset 的 owner
   * 檢查是否有訂單需要取消
   * @param project
   * @param event
   */
  async handleERC721Transfer(project: EventProject, event: ethers.Log) {
    try {
      const contractAddress = event.address.toLowerCase();
      const from = ethers
        .getAddress('0x' + event.topics[1].slice(26))
        .toLowerCase();
      const to = ethers
        .getAddress('0x' + event.topics[2].slice(26))
        .toLowerCase();
      const tokenId = BigInt(event.topics[3]).toString();

      this.logger.log(
        `[event-poller-nft-transfer] erc721TransferEvent contractAddress: ${contractAddress}, from: ${from}, to: ${to}, tokenId: ${tokenId}, chain: ${project.chainId}, hash: ${event.transactionHash}`,
      );

      this.sendSyncAssetToQueue({
        contractAddress,
        tokenId,
        chainId: project.chainId.toString() as ChainId,
      });

      // if (from === '0x0000000000000000000000000000000000000000') {
      //   // mint
      //   // this.assetDao.syncAssetOnChain({
      //   //   contractAddress,
      //   //   tokenId,
      //   //   chainId: project.chainId.toString() as ChainId,
      //   // });

      //   console.log('ERC721 mint handled');
      // } else {
      //   // normal transfer
      //   let assetId: string;
      //   const asset = await this.assetRepository.findOne({
      //     attributes: ['id'],
      //     where: {
      //       tokenId,
      //       chainId: project.chainId,
      //     },
      //     include: [
      //       {
      //         attributes: [],
      //         model: Contract,
      //         where: {
      //           address: contractAddress,
      //           chainId: project.chainId,
      //         },
      //       },
      //     ],
      //   });

      //   if (!asset) {
      //     const asset = await this.assetDao.syncAssetOnChain({
      //       contractAddress,
      //       tokenId,
      //       chainId: project.chainId.toString() as ChainId,
      //     });
      //   }
      //   assetId = asset.id;

      //   const assetAsEthAccount =
      //     await this.assetAsEthAccountRepository.findOne({
      //       where: {
      //         assetId,
      //       },
      //     });

      //   if (!assetAsEthAccount) {
      //     await this.assetAsEthAccountRepository.create({
      //       assetId,
      //       quantity: 1,
      //       ownerAddress: to,
      //     });
      //   } else {
      //     assetAsEthAccount.ownerAddress = to;
      //     await assetAsEthAccount.save();
      //   }

      //   console.log('ERC721 transfer handled');
      // }
    } catch (err) {
      this.logger.error(`handleERC721Transfer Error: ${event} ${err.message}`);
    }
  }

  async handleERC1155TransferSingle(project: EventProject, event: ethers.Log) {
    const contractAddress = event.address.toLowerCase();
    const erc1155Interface = new ethers.Interface(ERC_1155_ABI);
    const erc1155TransferSingleEvent = erc1155Interface.parseLog({
      topics: [...event.topics],
      data: event.data,
    });

    this.logger.log(
      `[event-poller-nft-transfer] erc1155TransferSingleEvent contractAddress: ${contractAddress}, from: ${erc1155TransferSingleEvent.args.from}, to: ${erc1155TransferSingleEvent.args.to}, tokenId: ${erc1155TransferSingleEvent.args.id.toString()}, value: ${erc1155TransferSingleEvent.args.value.toString()}, chain: ${project.chainId}, hash: ${event.transactionHash}`,
    );

    this.sendSyncAssetToQueue({
      contractAddress,
      tokenId: erc1155TransferSingleEvent.args.id.toString(),
      chainId: project.chainId.toString() as ChainId,
      fromAddress: erc1155TransferSingleEvent.args.from.toLowerCase(),
      toAddress: erc1155TransferSingleEvent.args.to.toLowerCase(),
    });

    // if (
    //   erc1155TransferSingleEvent.args.from ===
    //   '0x0000000000000000000000000000000000000000)'
    // ) {
    // try {
    //   await this.assetDao.syncAssetOnChain({
    //     contractAddress,
    //     tokenId: erc1155TransferSingleEvent.args.id.toString(),
    //     chainId: project.chainId.toString() as ChainId,
    //   });
    //   console.log(
    //     `ERC1155 mint handled ${contractAddress}, #${erc1155TransferSingleEvent.args.id.toString()} to ${erc1155TransferSingleEvent.args.to}`,
    //   );
    // } catch (err) {
    //   this.logger.error(
    //     `handleERC1155TransferSingle Error: ${event} ${err.message}`,
    //   );
    // }
    // }
  }

  async handleERC1155TransferBatch(project: EventProject, event: ethers.Log) {
    const contractAddress = event.address.toLowerCase();
    const erc1155Interface = new ethers.Interface(ERC_1155_ABI);
    const erc1155TransferBatchEvent = erc1155Interface.parseLog({
      topics: [...event.topics],
      data: event.data,
    });

    try {
      for (const id of erc1155TransferBatchEvent.args.ids) {
        this.logger.log(
          `[event-poller-nft-transfer] erc1155TransferBatchEvent contractAddress: ${contractAddress}, from: ${erc1155TransferBatchEvent.args.from}, to: ${erc1155TransferBatchEvent.args.to}, tokenId: ${erc1155TransferBatchEvent.args.ids.toString()}, value: ${erc1155TransferBatchEvent.args.values.toString()}, chain: ${project.chainId}, hash: ${event.transactionHash}`,
        );

        this.sendSyncAssetToQueue({
          contractAddress,
          tokenId: id.toString(),
          chainId: project.chainId.toString() as ChainId,
          fromAddress: erc1155TransferBatchEvent.args.from.toLowerCase(),
          toAddress: erc1155TransferBatchEvent.args.to.toLowerCase(),
        });
      }
    } catch (err) {
      this.logger.error(
        `handleERC1155TransferBatch Error: ${event} ${err.message}`,
      );
    }
  }

  async sendSyncAssetToQueue(assetKey: {
    contractAddress: string;
    tokenId: string;
    chainId: ChainId;
    fromAddress?: string;
    toAddress?: string;
  }) {
    const payload = {
      contractAddress: assetKey.contractAddress,
      tokenId: assetKey.tokenId,
      chainId: assetKey.chainId,
      fromAddress: assetKey.fromAddress,
      toAddress: assetKey.toAddress,
    };
    // await this.queueService.sendMessageToSqs(
    //   this.configService.get('AWS_SQS_ASSET_METADATA_URL'),
    //   payload,
    // );
    console.log('sendSyncAssetToQueue (QueueService Removed)', payload);
  }

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
