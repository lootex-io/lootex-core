import {
  Category,
  OfferType,
  OrderCancelledResponse,
} from './../../api/v3/order/order.interface';
import { BigNumber } from 'bignumber.js';
import * as promise from 'bluebird';
import { Promise } from 'bluebird';
import { AssetEventCategory } from '@/api/v3/asset/asset.interface';
import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import {
  AggregatorAddresses,
  chainBlocktime,
  COUNTER_INCREMENTED_SIGNATURE,
  getSoldItemEmailHtmlTemplate,
  ORDER_CANCELLED_SIGNATURE,
  ORDER_FULFILLED_SIGNATURE,
  ORDER_VALIDATED_SIGNATURE,
  POLLER_RETRY_LIMIT,
  PollingBatch,
  PollingInterval,
  SEAPORT_ABI,
  SeaportAddresses,
  SupportedChains,
} from './constants';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  Account,
  Asset,
  AssetAsEthAccount,
  Blockchain,
  Collection,
  Contract,
  Currency,
  PollerProgress,
  SeaportOrder,
  SeaportOrderAsset,
  SeaportOrderHistory,
  Wallet,
} from '@/model/entities';
import { ConfigurationService } from '@/configuration';
import {
  OrderFulfilledResponse,
  ReceivedItem,
  SpentItem,
} from '@/api/v3/order/order.interface';
import { InjectModel } from '@nestjs/sequelize';
import { Chain, ChainMap } from '@/common/libs/libs.service';
import { Op } from 'sequelize';
import {
  ContractType,
  IPFS_GATEWAY,
  NODE_ENV,
  NODE_ENV_PRODUCTION,
} from '@/common/utils';
import { CurrencyService as ThirdPartyCurrencyService } from '@/core/third-party-api/currency/currency.service';
import { ChainId } from '@/common/utils/types';
import { AssetService } from '@/api/v3/asset/asset.service';
import { OrderStatus } from '@/model/entities/constant-model';
import { SeaportOrderHistoryDao } from '@/core/dao/seaport-order-history-dao';
import { BlockchainService } from '@/external/blockchain';
import { OrderService } from '@/api/v3/order/order.service';
import { CacheService } from '@/common/cache';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';
import { OrderDao } from '@/core/dao/order-dao';
import { LogService } from '@/core/log/log.service';
import {
  AssetExtraDao,
  UpdateAssetOrderCategory,
} from '@/core/dao/asset-extra-dao';
import { EventPollerDao } from '@/core/dao/event-poller.dao';

import { TRANSFER_TOPIC0 } from '@/api/v3/wallet/constants';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';
import { OrderQueueService } from '@/core/bull-queue/queue/order-queue.service';

@Injectable()
export class EventPollerService {
  private readonly logger = new Logger(EventPollerService.name);
  private readonly eventFilter: ethers.EventFilter;
  private retryDelay: number;

  // need wait chain this block all contract task done, then start next block
  private chainContractsProgress: {
    [key: number]: {
      contractAddress: string;
      isRunning: boolean;
      isFinished: boolean;
      blockNumber?: number;
    }[];
  } = {};

  constructor(
    @InjectModel(Asset)
    private assetRepository: typeof Asset,

    @InjectModel(Account)
    private readonly accountRepository: typeof Account,

    @InjectModel(AssetAsEthAccount)
    private readonly assetAsEthAccountRepository: typeof AssetAsEthAccount,

    @InjectModel(Collection)
    private readonly collectionRepository: typeof Collection,

    @InjectModel(SeaportOrder)
    private readonly seaportOrderRepository: typeof SeaportOrder,

    @InjectModel(SeaportOrderAsset)
    private readonly seaportOrderAssetRepository: typeof SeaportOrderAsset,

    @InjectModel(SeaportOrderHistory)
    private readonly seaportOrderHistoryRepository: typeof SeaportOrderHistory,

    @InjectModel(Currency)
    private readonly currencyRepository: typeof Currency,

    @InjectModel(PollerProgress)
    private readonly pollerProgressRepository: typeof PollerProgress,

    private readonly schedulerRegistry: SchedulerRegistry,

    private readonly configService: ConfigurationService,

    private thirdPartyCurrencyService: ThirdPartyCurrencyService,

    private assetService: AssetService,

    private assetExtraDao: AssetExtraDao,

    private blockchainService: BlockchainService,

    private seaportOrderHistoryDao: SeaportOrderHistoryDao,

    private rpcHandlerService: RpcHandlerService,

    private logService: LogService,

    private orderService: OrderService,
    private orderDao: OrderDao,
    private eventPollerDao: EventPollerDao,

    private cacheService: CacheService,


    private gatewayService: GatewayService,

    private orderQueueService: OrderQueueService,
  ) {
    this.eventFilter = {
      topics: [
        // [[A, B, C, D]]: A or B or C or D
        [
          ethers.utils.id(ORDER_FULFILLED_SIGNATURE),
          ethers.utils.id(ORDER_CANCELLED_SIGNATURE),
          ethers.utils.id(ORDER_VALIDATED_SIGNATURE),
          ethers.utils.id(COUNTER_INCREMENTED_SIGNATURE),
        ],
      ],
    };

    // setTimeout(async () => {
    //   const chainId = 8453;
    //   const address = '0x5C019E4D86CD7Fa9a8c1C3d9D53FF90b3198705d';
    //   const contract = new ethers.Contract(
    //     address,
    //     SEAPORT_ABI,
    //     this.rpcHandlerService.createStaticJsonRpcProvider(chainId),
    //   );
    //
    //   const events = await this.eventPollerDao.queryFilter({
    //     chainId: chainId,
    //     contract: contract,
    //     eventFilter: this.eventFilter,
    //     fromBlock: 23296310,
    //     toBlock: 23296310,
    //   });
    //   const wrapEvents = this.wrapEvent(contract, events);
    //   wrapEvents.map((item) => {
    //     item.eventNames.map(async (eventName) => {
    //       eventName.events.map((e) => {
    //         const parsedEvent = contract.interface.parseLog(e);
    //         const offerer = parsedEvent.args.offerer;
    //         console.log(
    //           `eventName --------- aaaa ${eventName} ${offerer} ${parsedEvent.args.orderHash}`,
    //         );
    //         this.handleEvent(chainId, contract, e);
    //       });
    //       if (eventName.eventName === 'OrderFulfilled') {
    //         await this.handleFulfilledOrderTradeReward(
    //           chainId,
    //           contract,
    //           item.txHash,
    //           eventName,
    //         );
    //       }
    //     });
    //   });
    // }, 1000);
  }

  setEvmPollTasks() {
    const chainNames = Object.values(SupportedChains);
    // const chainNames = Object.values([]); // test
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
      if (chainName === Chain.SONEIUM_MINATO) {
        // soneium minato 先跳过
        continue;
      }

      this.chainContractsProgress[ChainMap[chainName].id] = [];
      const rpcName = ChainMap[chainName].RPC;
      const seaportAddresses = SeaportAddresses[chainName];
      console.log(`seaportAddresses ${chainName} `, seaportAddresses);
      for (const seaportAddress of seaportAddresses) {
        const blocktime = chainBlocktime[chainName];
        const pollingBatch = PollingBatch[chainName];
        const retryLimit = POLLER_RETRY_LIMIT;
        const retryCnt = 0;
        const taskName = `POLLER_TASK_${rpcName}_${seaportAddress}`;
        const chainId = ChainMap[chainName].id;
        const evmPoll = this.evmPoll.bind(this);
        const pollingInterval = PollingInterval[chainName];
        const pollerTaskId = setInterval(
          evmPoll,
          pollingInterval,
          chainId,
          seaportAddress,
          pollingBatch,
          retryLimit,
          retryCnt,
        );
        this.chainContractsProgress[chainId].push({
          contractAddress: seaportAddress,
          isRunning: false,
          isFinished: false,
          blockNumber: 0,
        });

        this.schedulerRegistry.addInterval(taskName, pollerTaskId);
        this.logger.debug(
          `EventPoller setEvmPollTasks: Registered poller task for chain ${rpcName}`,
        );
      }
    }
  }

  async getLastPolledBlockNumber(chainId: number): Promise<number> {
    const pollerProgress = await this.pollerProgressRepository.findOne({
      where: {
        chainId: chainId,
      },
    });
    return pollerProgress.lastPolledBlock;
  }

  async saveProgress(chainId: number, lastPolledBlock: number) {
    const chainProgress = await this.pollerProgressRepository.update(
      {
        lastPolledBlock: lastPolledBlock,
      },
      {
        where: {
          chainId: chainId,
        },
      },
    );
    return chainProgress;
  }

  clearAllEvmPollTasks() {
    const intervals = this.schedulerRegistry.getIntervals();
    for (const interval of intervals) {
      this.schedulerRegistry.deleteInterval(interval);
      this.logger.warn(
        `clearAllEvmPollTasks: Deleted polling task ${interval}`,
      );
    }
    this.logger.warn(`clearAllEvmPollTasks: Deleted all EVM polling tasks`);
  }

  clearAllRetryTasks() {
    const timeouts = this.schedulerRegistry.getTimeouts();
    for (const timeout of timeouts) {
      this.schedulerRegistry.deleteTimeout(timeout);
      this.logger.warn(`clearAllEvmPollTasks: Deleted polling task ${timeout}`);
    }
    this.logger.warn(`clearAllRetryTasks: Deleted all retry tasks`);
  }

  async evmPoll(
    chainId: number,
    seaportAddress: string,
    pollingBatch: number,
    retryLimit: number,
    retryCnt: number,
  ): Promise<boolean> {
    const retry_task_timestamp = new Date().getTime();
    const rpcUrl = this.rpcHandlerService.getRpcUrl(chainId, RpcEnd.event);
    const provider = new ethers.providers.StaticJsonRpcProvider(
      rpcUrl,
      +chainId,
    );
    const seaport = new ethers.Contract(seaportAddress, SEAPORT_ABI, provider);

    if (this.getChainContractProgress(chainId, seaportAddress).isRunning) {
      this.logger.debug(
        `chainId ${chainId} seaportAddress ${seaportAddress} task is running, skip this time.`,
      );
      return;
    }

    this.setChainContractProgress(chainId, seaportAddress, {
      isRunning: true,
      isFinished: false,
    });
    let fromBlock: number;
    try {
      fromBlock = (await this.getLastPolledBlockNumber(chainId)) + 1;
    } catch (err) {
      this.logger.warn(`chainId ${chainId} Database Error: ${err.message}`);
      // this.setRetryTask(
      //   `Chain_${chainId}_retry_task_${retry_task_timestamp}`,
      //   chainId,
      //   rpcEndpoint,
      //   seaportAddress,
      //   pollingBatch,
      //   retryLimit,
      //   retryCnt,
      // );
      this.setChainContractProgress(chainId, seaportAddress, {
        isRunning: false,
      });
      return false;
    }

    if (!fromBlock) {
      this.logger.warn(
        `chainId ${chainId} poll: invalid fromBlock. Could result from failing call to DB`,
      );
      this.setChainContractProgress(chainId, seaportAddress, {
        isRunning: false,
      });
      return false;
    }

    let latestBlock: number;
    try {
      latestBlock = await this.eventPollerDao.getLatestBlockNumber(chainId);
      // latestBlock = await this.getLatestBlockNumber(seaport);
    } catch (err) {
      this.logger.warn(`chain ${chainId} RPC Error: ${err.message}`);
      // this.setRetryTask(
      //   `Chain_${chainId}_retry_task_${retry_task_timestamp}`,
      //   chainId,
      //   rpcEndpoint,
      //   seaportAddress,
      //   pollingBatch,
      //   retryLimit,
      //   retryCnt,
      // );
      this.rpcHandlerService.switchRpcIndex(chainId, RpcEnd.event);
      this.setChainContractProgress(chainId, seaportAddress, {
        isRunning: false,
      });
      return false;
    }

    if (!latestBlock || latestBlock < fromBlock) {
      this.logger.warn(
        `chainId ${chainId} poll: invalid latestBlock. Could result from failure of RPC endpoint`,
      );
      this.setChainContractProgress(chainId, seaportAddress, {
        isRunning: false,
      });
      return false;
    }

    let toBlock =
      fromBlock + pollingBatch <= latestBlock
        ? fromBlock + pollingBatch
        : latestBlock;

    // 如果相差超过2000个区块，每次抓取block最大值
    if (latestBlock - fromBlock > 2000) {
      const maxCatchBlockNumber =
        +this.configService.get('EVENT_POLLER_MAX_CATCH_BLOCK_NUMBER') ||
        pollingBatch;
      const actualBatch = Math.min(maxCatchBlockNumber, pollingBatch);
      toBlock = fromBlock + actualBatch;
    }

    let events: ethers.Event[];
    try {
      events = await this.eventPollerDao.queryFilter({
        chainId: chainId,
        contract: seaport,
        fromBlock: fromBlock,
        toBlock: toBlock,
        eventFilter: this.eventFilter,
      });
      // events = await this.getEvents(chainId, seaport, fromBlock, toBlock);
    } catch (err) {
      this.logger.warn(`chain ${chainId} RPC Error: ${err.message}`);
      // this.setRetryTask(
      //   `Chain_${chainId}_retry_task_${retry_task_timestamp}`,
      //   chainId,
      //   rpcEndpoint,
      //   seaportAddress,
      //   pollingBatch,
      //   retryLimit,
      //   retryCnt,
      // );
      this.rpcHandlerService.switchRpcIndex(chainId, RpcEnd.event);
      this.setChainContractProgress(chainId, seaportAddress, {
        isRunning: false,
      });
      return false;
    }

    // await until all contract task finished
    this.setChainContractProgress(chainId, seaportAddress, {
      isFinished: true,
      blockNumber: toBlock,
    });
    await this.waitForChainAllContractProgressIsFinished(chainId);

    if (events.length === 0) {
      await this.saveProgress(chainId, toBlock);
      this.logger.debug(
        `chainId ${chainId} poll: Skip from Block ${fromBlock} to Block ${toBlock}`,
      );
      this.setChainContractProgress(chainId, seaportAddress, {
        isRunning: false,
      });
      return true;
    }
    this.logger.debug(
      `chainId ${chainId} poll: ${events.length} Seaport events from Block ${fromBlock} to Block ${toBlock}`,
    );

    const wrapEvents = this.wrapEvent(seaport, events);

    await promise
      .map(
        wrapEvents,
        (item) => {
          item.eventNames.map(async (eventName) => {
            eventName.events.map((e) => {
              this.handleEvent(chainId, seaport, e);
            });
            // 对于 OrderFulfilled 需要额外处理
            if (eventName.eventName === 'OrderFulfilled') {
              await this.handleFulfilledOrderTradeReward(
                chainId,
                seaport,
                item.txHash,
                eventName,
              );
            }
          });
        },
        {
          concurrency: 5,
        },
      ) // 設定同時並行的數量
      .then(() => {
        this.saveProgress(chainId, toBlock);
        return true;
      })
      .catch((err) => {
        // this.setRetryTask(
        //   `Chain_${chainId}_retry_task_${retry_task_timestamp}`,
        //   chainId,
        //   rpcEndpoint,
        //   seaportAddress,
        //   pollingBatch,
        //   retryLimit,
        //   retryCnt,
        // );
        this.logger.error(`chainId ${chainId} Database Error: ${err.message}`);
        return false;
      })
      .finally(() => {
        this.setChainContractProgress(chainId, seaportAddress, {
          isRunning: false,
        });
        this.logger.debug(`chainId ${chainId} task completed`);
      });
  }

  /**
   * 合并事件（依次按照txHash, eventName分组）返回 { txHash: string; eventNames: { eventName: string; events: ethers.Event[] }[]; }[]
   * @param events
   */
  wrapEvent(seaport: ethers.Contract, events: ethers.Event[]) {
    const res: {
      txHash: string;
      eventNames: { eventName: string; events: ethers.Event[] }[];
    }[] = [];
    for (const event of events) {
      const txHash = event.transactionHash;
      const parsedEvent = seaport.interface.parseLog(event);
      const eventName = parsedEvent.name;
      let resItem = res.find((e) => e.txHash === txHash);
      if (!resItem) {
        resItem = { txHash: txHash, eventNames: [] };
        res.push(resItem);
      }
      let itemEventName = resItem.eventNames.find(
        (e) => e.eventName === eventName,
      );
      if (!itemEventName) {
        itemEventName = { eventName: eventName, events: [] };
        resItem.eventNames.push(itemEventName);
      }
      itemEventName.events.push(event);
    }
    return res;
  }

  async handleEvent(
    chainId: number,
    seaport: ethers.Contract,
    event: ethers.Event,
  ) {
    const parsedEvent = seaport.interface.parseLog(event);

    const eventName = parsedEvent.name;
    const offerer = parsedEvent.args.offerer;
    this.logger.log(`eventName ${eventName} ${parsedEvent.args.toString()}`);

    // 避免30s重複執行相同事件可能造成並發修改錯誤
    const eventKey = `event:${eventName}:${parsedEvent.args.toString()}`;
    if (await this.cacheService.getCache(eventKey)) {
      this.logger.log(
        `eventName ${eventName} ${parsedEvent.args} have been handled`,
      );
      return;
    } else {
      await this.cacheService.setCache(eventKey, 30);
    }

    const dbOrder = await this.seaportOrderRepository.findOne({
      attributes: ['id'],
      where: {
        hash: parsedEvent.args.orderHash,
        chainId: chainId,
      },
    });

    // 不處理不是我們 DB 的訂單記錄
    if (!dbOrder) {
      this.logger.log(
        `chainId ${chainId} poll: orderHash ${parsedEvent.args.orderHash} is not exist in database order`,
      );
      return;
    }

    try {
      if (eventName === 'OrderFulfilled') {
        const txHash = event.transactionHash;
        const exchangeAddress = event.address.toLowerCase();
        const orderFulfilledResponse: OrderFulfilledResponse = {
          orderHash: parsedEvent.args.orderHash,
          offerer: parsedEvent.args.offerer,
          zone: parsedEvent.args.zone,
          recipient: parsedEvent.args.recipient,
          offer: parsedEvent.args.offer,
          consideration: parsedEvent.args.consideration,
        };
        const block = await event.getBlock();
        const blockTime = new Date(block.timestamp * 1000);

        await this.orderService.handleOrderFulfilledEvent(
          txHash,
          exchangeAddress,
          orderFulfilledResponse,
          chainId,
          blockTime,
        );
      } else if (eventName === 'OrderCancelled') {
        const txHash = event.transactionHash;
        const orderCancelledResponse: OrderCancelledResponse = {
          orderHash: parsedEvent.args.orderHash,
          offerer: parsedEvent.args.offerer,
          zone: parsedEvent.args.zone,
        };
        const blockTime = new Date((await event.getBlock()).timestamp * 1000);

        await this.orderService.handleOrderCancelledEvent(
          txHash,
          blockTime,
          orderCancelledResponse,
          chainId,
        );
      } else if (eventName === 'OrderValidated') {
        const orderHash = parsedEvent.args.orderHash;
        await this.updateValidatedOrder(orderHash, offerer, chainId);
      } else if (eventName === 'CounterIncremented') {
        await this.updateAllCancelledOrder(offerer, chainId);
      }
    } catch (err) {
      console.log(err);
      throw new Error(`${err.message}`);
    }
  }

  async updateFulfilledOrder(
    orderHash: string,
    offerer: string,
    chainId: number,
  ) {
    const updatedCount = await this.seaportOrderRepository.update(
      {
        isFillable: false,
      },
      {
        where: {
          hash: orderHash,
          offerer: offerer.toLowerCase(),
          chainId: chainId,
        },
      },
    );
    return updatedCount;
  }

  async updateCancelledOrder(
    orderHash: string,
    offerer: string,
    chainId: number,
  ) {
    const updatedCount = await this.seaportOrderRepository.update(
      {
        isFillable: false,
        isCancelled: true,
      },
      {
        where: {
          hash: orderHash,
          offerer: offerer.toLowerCase(),
          chainId: chainId,
        },
      },
    );

    const dbOrder = await this.seaportOrderRepository.findOne({
      where: {
        hash: orderHash,
        offerer: offerer.toLowerCase(),
        chainId: chainId,
      },
      include: [
        {
          model: SeaportOrderAsset,
          where: {
            side: 1,
            itemType: { [Op.in]: [4, 5] },
          },
        },
      ],
    });

    if (!dbOrder) {
      this.logger.debug(
        `chainId ${chainId} poll: orderHash ${orderHash} is not exist in database order`,
      );
      return;
    }

    if (
      dbOrder.category === Category.OFFER &&
      dbOrder.offerType === OfferType.COLLECTION
    ) {
      const collection = await this.collectionRepository.findOne({
        attributes: ['id', 'slug'],
        where: {
          contractAddress: dbOrder.SeaportOrderAssets[0].token.toLowerCase(),
          chainId: chainId,
        },
      });
      if (collection) {
        const bestCollectionOffer =
          await this.orderService.getBestCollectionOffer(collection.slug);
        if (
          bestCollectionOffer.hasBestCollectionOrder &&
          bestCollectionOffer.bestSeaportOrder.hash?.toLowerCase() ===
            orderHash?.toLowerCase()
        ) {
          const newBestCollectionOffer =
            await this.orderService.getBestCollectionOffer(
              collection.slug,
              true,
            );
          this.logger.debug(
            `chainId ${chainId} poll: update best collection offer orderId ${newBestCollectionOffer.bestCollectionOfferOrder.id} orderHash ${newBestCollectionOffer.bestCollectionOfferOrder.id}`,
          );
        }
      }
    }

    return updatedCount;
  }

  async updateValidatedOrder(
    orderHash: string,
    offerer: string,
    chainId: number,
  ) {
    const updatedCount = await this.seaportOrderRepository.update(
      {
        isValidated: true,
      },
      {
        where: {
          hash: orderHash,
          offerer: offerer.toLowerCase(),
          chainId: chainId,
        },
      },
    );
    await this.seaportOrderHistoryDao.updateOrderHistoryStatus(
      { orderHash: orderHash, chainId: chainId },
      OrderStatus.VALIDATED,
    );
    return updatedCount;
  }

  async updateAllCancelledOrder(offerer: string, chainId: number) {
    const updatedCount = await this.seaportOrderRepository.update(
      {
        isFillable: false,
        isCancelled: true,
      },
      {
        where: {
          offerer: offerer.toLowerCase(),
          chainId: chainId,
        },
      },
    );

    //
    const seaOrders = await this.seaportOrderRepository.findAll({
      attributes: ['hash'],
      where: {
        offerer: offerer.toLowerCase(),
        chainId: chainId,
      },
    });
    Promise.map(
      seaOrders,
      async (order) => {
        await this.updateOrderAssetExtra(order.hash, offerer, chainId);

        await this.seaportOrderHistoryDao.updateOrderHistoryStatus(
          { orderHash: order.hash, chainId: chainId },
          OrderStatus.CANCELED,
        );
      },
      { concurrency: 2 },
    );

    return updatedCount;
  }

  async createFulfilledOrderHistory(
    event: ethers.Event,
    orderFulfilledResponse: OrderFulfilledResponse,
    chainId: number,
  ) {
    const dbOrderHistory = await this.seaportOrderHistoryRepository.findAll({
      where: {
        hash: orderFulfilledResponse.orderHash,
        txHash: event.transactionHash,
        chainId: chainId,
      },
    });
    // check if order history IS exist, skip
    //確保不會記錄重複的 order history
    if (dbOrderHistory && dbOrderHistory.length > 0) {
      // update service fee info of order history
      for (const orderHistory of dbOrderHistory) {
        if (!orderHistory.serviceFeeUsdPrice) {
          const { serviceFeeAmount, serviceFeeUsdPrice } =
            await this.orderDao.getOrderServiceFeeInfo(
              chainId,
              orderFulfilledResponse.consideration as any,
            );
          orderHistory.serviceFeeAmount = serviceFeeAmount;
          orderHistory.serviceFeeUsdPrice = serviceFeeUsdPrice?.toNumber();
          await orderHistory.save();
          this.logger.debug(
            `update service fee info success ${serviceFeeUsdPrice?.toNumber()}`,
          );
        }
      }

      return dbOrderHistory;
    }

    const dbOrder = await this.seaportOrderRepository.findOne({
      where: {
        hash: orderFulfilledResponse.orderHash,
        chainId: chainId,
      },
      include: [
        {
          attributes: ['id'],
          model: SeaportOrderAsset,
        },
      ],
    });
    // check if order IS NOT exist, skip
    // 確保不會記錄不是我們這邊的訂單的 history
    if (!dbOrder) {
      this.logger.debug(
        `chainId ${chainId} poll: OrderFulfilled event ${event.transactionHash} orderHash ${orderFulfilledResponse.orderHash} is not exist in database order`,
      );
      return;
    }

    // 把訂單的 asset 跟 currency 分開
    const { orderAssets, orderCurrencies } = this.getFulfilledOrderAssets(
      dbOrder,
      orderFulfilledResponse,
    );
    const { orderPrice, currencySymbol, orderUsdPrice } =
      await this.getFulfilledOrderPrice(chainId, orderCurrencies);

    // cal service fee usd price
    const { serviceFeeAmount, serviceFeeUsdPrice } =
      await this.orderDao.getOrderServiceFeeInfo(
        chainId,
        orderFulfilledResponse.consideration as any[],
      );

    const orderHistories = [];
    const txHash = (await event.getTransaction()).hash;
    const txTime = new Date((await (await event.getBlock()).timestamp) * 1000);

    // offer items
    // 代表成交 list
    for (const item of orderFulfilledResponse.offer) {
      // if it's NFT, it's fulfilled offer
      if (item.itemType > 1) {
        orderHistories.push({
          contractAddress: item.token.toLowerCase(),
          tokenId: item.identifier.toString(),
          amount: item.amount.toString(),
          chainId: chainId,
          category: AssetEventCategory.SALE,
          startTime: txTime,
          price: orderPrice.toNumber(),
          currencySymbol: currencySymbol,
          usdPrice: orderUsdPrice.toNumber(),
          fromAddress: orderFulfilledResponse.offerer.toLowerCase(),
          toAddress: orderFulfilledResponse.recipient.toLowerCase(),
          hash: orderFulfilledResponse.orderHash,
          txHash: txHash,
          exchangeAddress: event.address.toLowerCase(),
        });
      }
    }

    // consideration items
    // 代表成交 offer
    for (const item of orderFulfilledResponse.consideration) {
      // 因為 offer 訂單的 NFT 有時候會經過 aggregator 合約，所以要找出真正的 fromAddress
      let fromAddress = orderFulfilledResponse.recipient.toLowerCase();
      if (fromAddress === AggregatorAddresses[chainId].toLowerCase()) {
        const transactionReceipt =
          await this.gatewayService.getTransactionReceipt(chainId, txHash);
        const logs = transactionReceipt.logs;

        // 從 logs 找出這個 token 的 transfer event
        const transferLog = logs.find((log) => {
          const tokenId = log.topics[3]
            ? ethers.BigNumber.from(log.topics[3]).toString()
            : null;
          if (!tokenId) {
            return false;
          }

          return (
            log.topics[0] === TRANSFER_TOPIC0 &&
            log.address.toLowerCase() === item.token.toLowerCase() &&
            // to address is in AggregatorAddresses
            '0x' + log.topics[2].slice(26) ===
              AggregatorAddresses[chainId].toLowerCase() &&
            ethers.BigNumber.from(log.topics[3]).eq(item.identifier)
          );
        });
        if (transferLog) {
          fromAddress = '0x' + transferLog.topics[1].slice(26).toLowerCase();
        }
      }

      // if it's NFT, it's fulfilled order
      if (item.itemType > 1) {
        orderHistories.push({
          contractAddress: item.token.toLowerCase(),
          tokenId: item.identifier.toString(),
          amount: item.amount.toString(),
          chainId: chainId,
          category: AssetEventCategory.SALE,
          startTime: txTime,
          price: orderPrice.toNumber(),
          serviceFeeAmount: serviceFeeAmount,
          serviceFeeUsdPrice: serviceFeeUsdPrice?.toNumber(),
          currencySymbol: currencySymbol,
          usdPrice: orderUsdPrice.toNumber(),
          fromAddress,
          toAddress: orderFulfilledResponse.offerer.toLowerCase(),
          hash: orderFulfilledResponse.orderHash,
          txHash: txHash,
          exchangeAddress: event.address.toLowerCase(),
        });
      }
    }

    const updatedCount =
      await this.seaportOrderHistoryRepository.bulkCreate(orderHistories);

    await promise.map(orderHistories, async (orderHistory) => {
      await this.assetService.transferAssetOwnershipOnchain({
        contractAddress: orderHistory.contractAddress,
        tokenId: orderHistory.tokenId,
        chainId: chainId.toString() as ChainId,
        fromAddress: orderHistory.fromAddress,
        toAddress: orderHistory.toAddress,
      });
    });

    // 更新 availableAmount
    // available_amount = offer.endAmount * (numerator / denominator)

    // 跟 seaport 合約取得 numerator, denominator
    const orderStatus: {
      isValidated: boolean;
      isCancelled: boolean;
      totalFilled: ethers.BigNumber;
      totalSize: ethers.BigNumber;
    } = await this.orderDao.getSeaportOrderStatusOnChain(
      dbOrder.hash,
      chainId,
      dbOrder.exchangeAddress,
    );

    let isFullyFilled = false;
    if (orderStatus.isValidated) {
      await Promise.all(
        dbOrder.SeaportOrderAssets.map(async (orderAssetId) => {
          const orderAsset = await this.seaportOrderAssetRepository.findOne({
            where: {
              id: orderAssetId.id,
            },
          });

          // availableAmount = startAmount - startAmount * (totalFilled / totalSize);
          // use ethers.BigNumber to avoid overflow
          const startAmount = ethers.BigNumber.from(orderAsset.startAmount);
          const availableAmount = startAmount.sub(
            startAmount.mul(orderStatus.totalFilled).div(orderStatus.totalSize),
          );
          // fully filled
          if (availableAmount.isZero()) {
            isFullyFilled = true;
            await this.updateFulfilledOrder(
              orderFulfilledResponse.orderHash,
              orderFulfilledResponse.offerer,
              chainId,
            );
          }

          await this.seaportOrderAssetRepository.update(
            {
              availableAmount: availableAmount.toString(),
            },
            {
              where: {
                id: orderAssetId.id,
              },
            },
          );
        }),
      );
    }

    if (isFullyFilled) {
      await this.seaportOrderHistoryDao.updateOrderHistoryStatus(
        { orderHash: orderFulfilledResponse.orderHash, chainId: chainId },
        OrderStatus.FULFILLED,
      );
    }

    if (
      dbOrder.category === Category.OFFER &&
      dbOrder.offerType === OfferType.COLLECTION &&
      isFullyFilled
    ) {
      const collection = await this.collectionRepository.findOne({
        attributes: ['id', 'slug'],
        where: {
          contractAddress: orderAssets[0].contractAddress.toLowerCase(),
          chainId: chainId,
        },
      });
      if (collection) {
        const bestCollectionOffer =
          await this.orderService.getBestCollectionOffer(collection.slug);
        if (
          bestCollectionOffer.hasBestCollectionOrder &&
          bestCollectionOffer.bestSeaportOrder?.hash?.toLowerCase() ===
            orderFulfilledResponse.orderHash?.toLowerCase()
        ) {
          const newBestCollectionOffer =
            await this.orderService.getBestCollectionOffer(
              collection.slug,
              true,
            );
          this.logger.debug(
            `chainId ${chainId} poll: update best collection offer orderId ${newBestCollectionOffer.bestCollectionOfferOrder.id} orderHash ${newBestCollectionOffer.bestCollectionOfferOrder.id}`,
          );
        }
      }
    }

    this.logger.debug(
      `chainId: ${chainId} order hash: ${orderFulfilledResponse.orderHash} fulfilled order history created, order category: ${dbOrder.category} isFullyFilled: ${isFullyFilled}`,
    );

    const assets = await Promise.map(orderAssets, async (e) => {
      const asset = await this.assetRepository.findOne({
        where: {
          token_id: e.tokenId?.toString(),
          chain_id: chainId,
        },
        include: {
          model: Contract,
          where: {
            address: e.contractAddress.toLowerCase(),
          },
        },
      });
      return {
        assetId: asset.id,
        contractAddress: e.contractAddress,
        tokenId: e.tokenId?.toString(),
        chainId: chainId,
        contractType: asset.Contract.schemaName,
      };
    });
    await this.orderDao.disableOrderByAssets(assets);

    assets.map((asset) => {
      if (asset.assetId) {
        this.orderQueueService.updateAssetBestOrder(
          asset.assetId,
          null,
          UpdateAssetOrderCategory.ListingAndOffer,
        );
      }
    });

    orderAssets.forEach((orderAsset) => {
      if (dbOrder.category === Category.LISTING) {
        this.orderService.updateCollectionBestListingToCache(
          orderAsset.contractAddress,
          chainId.toString(),
          {
            force: true,
          },
        );
      } else if (dbOrder.category === Category.OFFER) {
        this.orderService.updateCollectionBestOfferToCache(
          orderAsset.contractAddress,
          chainId.toString(),
          {
            force: true,
          },
        );
      }
    });

    return updatedCount;
  }

  /**
   * 获取fulfilled事件中订单assets, currencies
   * @param dbOrder
   * @param orderFulfilledResponse
   */
  getFulfilledOrderAssets(dbOrder: SeaportOrder, orderFulfilledResponse) {
    // 把訂單的 asset 跟 currency 分開
    const orderAssets: {
      contractAddress: string;
      tokenId: ethers.BigNumber;
      amount: ethers.BigNumber;
    }[] = [];
    const orderCurrencies: {
      contractAddress: string;
      amount: ethers.BigNumber;
    }[] = [];
    if (dbOrder.category == Category.LISTING) {
      // SpentItem
      // - NFT
      // ReceivedItem
      // - Seller payment
      // - Participation 1
      // - Participation ...
      orderFulfilledResponse.offer.forEach((item: SpentItem) => {
        if (item.itemType > 1) {
          orderAssets.push({
            contractAddress: item.token,
            tokenId: item.identifier,
            amount: item.amount,
          });
        }
      });
      orderFulfilledResponse.consideration.forEach((item: ReceivedItem) => {
        if (item.itemType < 2) {
          orderCurrencies.push({
            contractAddress: item.token,
            amount: item.amount,
          });
        }
      });
    } else if (dbOrder.category == Category.OFFER) {
      // SpentItem
      // - Full payment
      // ReceivedItem
      // - NFT (to fulfiller)
      // - Participation 1
      // - Participation ...
      orderFulfilledResponse.offer.forEach((item: SpentItem) => {
        if (item.itemType < 2) {
          orderCurrencies.push({
            contractAddress: item.token,
            amount: item.amount,
          });
        }
      });
      orderFulfilledResponse.consideration.forEach((item: ReceivedItem) => {
        if (item.itemType > 1) {
          orderAssets.push({
            contractAddress: item.token,
            tokenId: item.identifier,
            amount: item.amount,
          });
        }
      });
    } else {
      orderFulfilledResponse.offer.forEach((item: SpentItem) => {
        if (item.itemType < 2) {
          orderCurrencies.push({
            contractAddress: item.token,
            amount: item.amount,
          });
        } else {
          orderAssets.push({
            contractAddress: item.token,
            tokenId: item.identifier,
            amount: item.amount,
          });
        }
      });

      orderFulfilledResponse.consideration.forEach((item: ReceivedItem) => {
        if (item.itemType < 2) {
          orderCurrencies.push({
            contractAddress: item.token,
            amount: item.amount,
          });
        } else {
          orderAssets.push({
            contractAddress: item.token,
            tokenId: item.identifier,
            amount: item.amount,
          });
        }
      });
    }
    return { orderAssets, orderCurrencies };
  }

  /**
   * 获取订单价格
   * @param chainId
   * @param orderCurrencies
   */
  @Cacheable({ seconds: 60 })
  async getFulfilledOrderPrice(
    chainId: number,
    orderCurrencies: {
      contractAddress: string;
      amount: ethers.BigNumber;
    }[],
  ) {
    // calculate order price
    // e.g., seller get 0.9 ETH
    // + platform fee 0.025 ETH
    // +  creator fee 0.075 ETH
    // =      order price 1 ETH
    let orderPrice = new BigNumber(0);
    let currencySymbol = '';
    let currencyDecimals = 0;
    await Promise.map(orderCurrencies, async (orderCurrency) => {
      if (currencySymbol === '') {
        const currency = await this.currencyRepository.findOne({
          where: {
            address: orderCurrency.contractAddress.toLowerCase(),
          },
          include: [
            {
              model: Blockchain,
              where: { chainId: chainId },
            },
          ],
        });
        // if use not in DB currency will be null
        if (currency) {
          currencySymbol = currency.symbol;
          currencyDecimals = currency.decimals;
        }
      }
      orderPrice = orderPrice.plus(orderCurrency.amount.toString());
    });
    orderPrice = orderPrice.shiftedBy(-currencyDecimals);

    // if WETH need to replace to ETH, because CurrencyService don't have warped token price
    const symbolUsd = currencySymbol
      ? await this.thirdPartyCurrencyService.getSymbolPrice(
          currencySymbol.replace(/^W/i, '') + 'USD',
        )
      : null;
    const symbolUsdPrice = symbolUsd ? symbolUsd.price : 0;
    const orderUsdPrice = orderPrice.multipliedBy(symbolUsdPrice);
    return { orderPrice, currencySymbol, orderUsdPrice };
  }

  /**
   * 获取买家地址
   * @param orderFulfilledResponse
   */
  getFulfilledOrderToAddress(orderFulfilledResponse) {
    // offer items
    // 代表成交 list
    for (const item of orderFulfilledResponse.offer) {
      // if it's NFT, it's fulfilled offer
      if (item.itemType > 1) {
        return orderFulfilledResponse.recipient.toLowerCase();
      }
    }
    // consideration items
    // 代表成交 offer
    for (const item of orderFulfilledResponse.consideration) {
      // if it's NFT, it's fulfilled order
      if (item.itemType > 1) {
        return orderFulfilledResponse.offerer.toLowerCase();
      }
    }
    return undefined;
  }

  async handleFulfilledOrderTradeReward(
    chainId: number,
    contract,
    txHash: string,
    eventName: { eventName: string; events: ethers.Event[] },
  ) {
    const toAddresses: string[] = [];
    const _createOrderFulfilledResponse = (e: ethers.Event) => {
      const parsedEvent = contract.interface.parseLog(e);
      const orderFulfilledResponse: OrderFulfilledResponse = {
        orderHash: parsedEvent.args.orderHash,
        offerer: parsedEvent.args.offerer,
        zone: parsedEvent.args.zone,
        recipient: parsedEvent.args.recipient,
        offer: parsedEvent.args.offer,
        consideration: parsedEvent.args.consideration,
      };
      return orderFulfilledResponse;
    };
    for (const e of eventName.events) {
      const orderFulfilledResponse = _createOrderFulfilledResponse(e);
      const toAddress = this.getFulfilledOrderToAddress(orderFulfilledResponse);
      if (toAddresses.indexOf(toAddress) === -1) {
        toAddresses.push(toAddress);
      }
    }
    for (const toAddress of toAddresses) {
      let totalOrderUsdPrice = new BigNumber(0);
      let totalServiceFeeUsdPrice = new BigNumber(0);
      for (const e of eventName.events) {
        const orderFulfilledResponse = _createOrderFulfilledResponse(e);
        if (
          toAddress == this.getFulfilledOrderToAddress(orderFulfilledResponse)
        ) {
          const dbOrder = await this.seaportOrderRepository.findOne({
            where: {
              hash: orderFulfilledResponse.orderHash,
              chainId: chainId,
            },
            include: [
              {
                attributes: ['id'],
                model: SeaportOrderAsset,
              },
            ],
          });
          if (!dbOrder) {
            this.logger.warn(
              `chainId ${chainId} poll: OrderFulfilled event ${orderFulfilledResponse.orderHash} is not exist in database order (handleFulfilledOrderTradeReward)`,
            );
            continue;
          }
          const { orderAssets, orderCurrencies } = this.getFulfilledOrderAssets(
            dbOrder,
            orderFulfilledResponse,
          );
          const { orderPrice, currencySymbol, orderUsdPrice } =
            await this.getFulfilledOrderPrice(chainId, orderCurrencies);
          const { serviceFeeAmount, serviceFeeUsdPrice } =
            await this.orderDao.getOrderServiceFeeInfo(
              chainId,
              orderFulfilledResponse.consideration as any,
            );
          totalOrderUsdPrice = totalOrderUsdPrice.plus(orderUsdPrice);
          totalServiceFeeUsdPrice =
            totalServiceFeeUsdPrice.plus(serviceFeeUsdPrice);
        }
      }
    }
  }

  async createCancelledOrderHistory(
    event: ethers.Event,
    orderCancelledResponse: OrderCancelledResponse,
    chainId: number,
  ) {
    const dbCancelHistory = await this.seaportOrderHistoryRepository.findOne({
      attributes: ['id'],
      where: {
        hash: orderCancelledResponse.orderHash,
        txHash: event.transactionHash,
        chainId: chainId,
      },
    });
    if (dbCancelHistory) {
      this.logger.debug(
        `chainId ${chainId} poll: OrderCancelled event ${event.transactionHash} orderHash ${orderCancelledResponse.orderHash} is exist in database seaport_order_history`,
      );
      return;
    }

    const orderCurrency = await this.seaportOrderAssetRepository.findOne({
      attributes: ['id'],
      where: {
        assetId: null,
      },
      include: [
        {
          attributes: ['id'],
          model: SeaportOrder,
          where: {
            hash: orderCancelledResponse.orderHash,
          },
        },
        {
          attributes: ['symbol'],
          required: true,
          model: Currency,
        },
      ],
    });
    if (!orderCurrency) {
      this.logger.debug(
        `chainId ${chainId} poll: OrderCancelled event ${event.transactionHash} orderHash ${orderCancelledResponse.orderHash} currency not found in database currency`,
      );
      return;
    }

    const orderAssets = await this.seaportOrderAssetRepository.findAll({
      where: { assetId: { [Op.not]: null } },
      include: [
        {
          model: SeaportOrder,
          where: {
            chainId: chainId,
            hash: orderCancelledResponse.orderHash,
          },
        },
        {
          attributes: ['tokenId'],
          model: Asset,
          include: [
            {
              attributes: ['address'],
              model: Contract,
            },
          ],
        },
      ],
    });

    if (orderAssets.length === 0) {
      // try to find collection offer
      const dbOrder = await this.seaportOrderRepository.findOne({
        attributes: ['category', 'offerType', 'price'],
        where: {
          hash: orderCancelledResponse.orderHash,
          chainId: chainId,
        },
        include: [
          {
            model: SeaportOrderAsset,
            where: {
              side: 1,
              itemType: { [Op.in]: [4, 5] },
            },
          },
        ],
      });

      if (
        dbOrder.category === Category.OFFER &&
        dbOrder.offerType === OfferType.COLLECTION
      ) {
        const cancelHistory = {
          contractAddress: dbOrder.SeaportOrderAssets[0].token.toLowerCase(),
          tokenId: '',
          amount: dbOrder.SeaportOrderAssets[0].availableAmount,
          chainId: chainId,
          category: AssetEventCategory.CANCEL,
          startTime: new Date(
            (await (await event.getBlock()).timestamp) * 1000,
          ),
          price: dbOrder.price,
          currencySymbol: orderCurrency.Currency.symbol,
          fromAddress: orderCancelledResponse.offerer?.toLowerCase(),
          hash: orderCancelledResponse.orderHash,
          txHash: event.transactionHash,
        };

        await this.seaportOrderHistoryRepository.create(cancelHistory);

        await this.seaportOrderHistoryDao.updateOrderHistoryStatus(
          {
            orderHash: orderCancelledResponse.orderHash,
            chainId: chainId,
          },
          OrderStatus.CANCELED,
        );

        return;
      }

      this.logger.debug(
        `chainId ${chainId} poll: OrderCancelled event ${event.transactionHash} orderHash ${orderCancelledResponse.orderHash} is not exist in database seaport_order_asset`,
      );
      return;
    }
    if (orderAssets[0].Asset.tokenId === null) {
      this.logger.debug(
        `chainId ${chainId} poll: OrderCancelled event ${event.transactionHash} orderHash ${orderCancelledResponse.orderHash} asset not found in database asset`,
      );
      return;
    }

    const cancelHistories = (await Promise.all(
      orderAssets.map(async (orderAsset) => {
        return {
          contractAddress: orderAsset.Asset.Contract.address,
          tokenId: orderAsset.Asset.tokenId,
          amount: orderAsset.startAmount,
          chainId: chainId,
          category: AssetEventCategory.CANCEL,
          startTime: new Date((await event.getBlock()).timestamp * 1000),
          price: orderAsset.SeaportOrder.price,
          currencySymbol: orderCurrency.Currency.symbol,
          fromAddress: orderCancelledResponse.offerer?.toLowerCase(),
          hash: orderCancelledResponse.orderHash,
          txHash: event.transactionHash,
        };
      }),
    )) as {
      contractAddress: string;
      tokenId: string;
      amount: string;
      chainId: number;
      category: AssetEventCategory;
      startTime: Date;
      price: string;
      currencySymbol: string;
      fromAddress: string;
      hash: string;
      txHash: string;
    }[];

    await this.seaportOrderHistoryRepository.bulkCreate(cancelHistories);

    await this.seaportOrderHistoryDao.updateOrderHistoryStatus(
      {
        orderHash: orderCancelledResponse.orderHash,
        chainId: chainId,
      },
      OrderStatus.CANCELED,
    );

    orderAssets.forEach((orderAsset) => {
      if (orderAsset.SeaportOrder.category === Category.LISTING) {
        this.orderService.updateCollectionBestListingToCache(
          orderAsset.Asset.Contract.address,
          chainId.toString(),
          {
            force: true,
          },
        );
      } else if (orderAsset.SeaportOrder.category === Category.OFFER) {
        this.orderService.updateCollectionBestOfferToCache(
          orderAsset.Asset.Contract.address,
          chainId.toString(),
          {
            force: true,
          },
        );
      }
    });

    return cancelHistories;
  }

  /**
   * // update extra of assets
   * @param orderHash
   * @param offerer
   * @param chainId
   */
  async updateOrderAssetExtra(
    orderHash: string,
    offerer: string,
    chainId: number,
  ) {
    this.logger.log(`updateOrderAssetExtra ${orderHash} ${offerer} ${chainId}`);
    // update extra of assets
    const seaportOrder = await this.seaportOrderRepository.findAll({
      attributes: ['id'],
      where: {
        hash: orderHash,
        offerer: offerer.toLowerCase(),
        chainId: chainId,
      },
    });
    const seaportOrderIds = seaportOrder.map((e) => e.id);
    if (seaportOrderIds && seaportOrderIds.length > 0) {
      const orderAssetIds = (
        await this.seaportOrderAssetRepository.findAll({
          attributes: ['assetId'],
          where: {
            seaportOrderId: seaportOrderIds,
          },
        })
      ).map((e) => e.assetId);
      // execute async
      if (orderAssetIds) {
        const ids = orderAssetIds.filter(
          (e) => e != null && e.trim().length !== 0,
        );
        ids.map((id) => {
          this.orderQueueService.updateAssetBestOrder(
            id,
            null,
            UpdateAssetOrderCategory.ListingAndOffer,
          );
          // this.assetExtraDao.updateAssetExtraBestOrderByAssetId(id);
        });
      }
    }
  }

  async updateAssetOwnership(
    orderFulfilledResponse: OrderFulfilledResponse,
    chainId: number,
  ) {
    const dbOrder = await this.seaportOrderRepository.findOne({
      attributes: ['category'],
      where: {
        hash: orderFulfilledResponse.orderHash,
        chainId,
      },
      include: [
        {
          attributes: ['assetId', 'itemType', 'token', 'identifierOrCriteria'],
          model: SeaportOrderAsset,
          where: {
            assetId: { [Op.not]: null },
          },
        },
      ],
    });

    if (!dbOrder) {
      this.logger.debug(
        `chainId ${chainId} poll: OrderFulfilled event orderHash ${orderFulfilledResponse.orderHash} is not exist in database seaport_order`,
      );
      return;
    }

    if (
      dbOrder.category !== Category.LISTING &&
      dbOrder.category !== Category.OFFER
    ) {
      this.logger.debug(
        `chainId ${chainId} poll: OrderFulfilled event orderHash ${orderFulfilledResponse.orderHash} category is not listing or offer`,
      );
      return;
    }

    // https://docs.opensea.io/reference/seaport-events-and-errors#orderfulfilled
    // 1. 判斷 offer 還是 list 的成交
    // 2. list 成交： offerer 是 from, recipient 是 to
    //    offer 成交： offerer 是 to, recipient 是 from
    // 3. 判斷是 ERC721 or ERC1155
    //    ERC721: assetId, fromAddress, toAddress
    //    ERC1155: assetId, fromAddress, toAddress, amount
    // 4. ERC721: fromAddress 的 asset ownership 要刪除，toAddress 的 asset ownership 要新增
    //    ERC1155: fromAddress 的 asset ownership 要減少，toAddress 的 asset ownership 要增加
    let fromAddress: string;
    let toAddress: string;
    let assetId: string;
    let quantity: ethers.BigNumber;
    let contractType: ContractType;
    if (dbOrder.category === Category.LISTING) {
      fromAddress = orderFulfilledResponse.offerer.toLowerCase();
      toAddress = orderFulfilledResponse.recipient.toLowerCase();
      assetId = dbOrder.SeaportOrderAssets[0].assetId;
      quantity = orderFulfilledResponse.offer[0].amount;
      contractType =
        dbOrder.SeaportOrderAssets[0].itemType === 2 ||
        dbOrder.SeaportOrderAssets[0].itemType === 4
          ? ContractType.ERC721
          : ContractType.ERC1155;
    } else if (dbOrder.category === Category.OFFER) {
      fromAddress = orderFulfilledResponse.recipient.toLowerCase();
      toAddress = orderFulfilledResponse.offerer.toLowerCase();
      assetId = dbOrder.SeaportOrderAssets[0].assetId;
      quantity = orderFulfilledResponse.consideration[0].amount;
      contractType =
        dbOrder.SeaportOrderAssets[0].itemType === 2 ||
        dbOrder.SeaportOrderAssets[0].itemType === 4
          ? ContractType.ERC721
          : ContractType.ERC1155;
    }

    const asset = await this.assetRepository.findOne({
      attributes: ['contractId'],
      where: { id: assetId },
    });
    const contractId = asset?.contractId;

    if (contractType === ContractType.ERC721) {
      const assetAsEthAccount = await this.assetAsEthAccountRepository.findOne({
        attributes: ['id'],
        where: {
          assetId,
        },
      });
      if (assetAsEthAccount) {
        await this.assetAsEthAccountRepository.update(
          {
            ownerAddress: toAddress,
            contractId,
          },
          {
            where: {
              id: assetAsEthAccount.id,
            },
          },
        );
      } else {
        await this.assetAsEthAccountRepository.create({
          assetId,
          ownerAddress: toAddress,
          quantity: '1',
          contractId,
        });
      }
    } else if (contractType === ContractType.ERC1155) {
      const sellerAssetAsEthAccount =
        await this.assetAsEthAccountRepository.findOne({
          attributes: ['id', 'quantity'],
          where: {
            assetId,
            ownerAddress: fromAddress,
          },
        });

      // Ownership may have transferred at other times
      if (!sellerAssetAsEthAccount) {
        this.logger.debug(
          `chainId ${chainId} poll: OrderFulfilled event orderHash ${orderFulfilledResponse.orderHash} assetId ${assetId} fromAddress ${fromAddress} is not exist in database asset_as_eth_account`,
        );
        return;
      }

      const sellerOriginalQuantity = sellerAssetAsEthAccount
        ? ethers.BigNumber.from(sellerAssetAsEthAccount.quantity)
        : ethers.BigNumber.from('0');
      const sellerNewQuantity = ethers.BigNumber.from(
        sellerOriginalQuantity,
      ).sub(quantity); // sellerOriginalQuantity - quantity

      const buyerAssetAsEthAccount =
        await this.assetAsEthAccountRepository.findOne({
          where: {
            assetId,
            ownerAddress: toAddress,
          },
        });
      const buyerOriginalQuantity = buyerAssetAsEthAccount
        ? buyerAssetAsEthAccount.quantity
        : '0';
      const buyerNewQuantity = ethers.BigNumber.from(buyerOriginalQuantity).add(
        quantity,
      ); // buyerOriginalQuantity + quantity

      if (sellerNewQuantity.eq(0)) {
        await sellerAssetAsEthAccount.destroy();
      } else {
        await sellerAssetAsEthAccount.update({
          quantity: sellerNewQuantity.toString(),
          contractId,
        });
      }

      if (buyerAssetAsEthAccount) {
        await buyerAssetAsEthAccount.update({
          quantity: buyerNewQuantity.toString(),
          contractId,
        });
      } else {
        await this.assetAsEthAccountRepository.create({
          assetId,
          quantity: buyerNewQuantity.toString(),
          ownerAddress: toAddress,
          contractId,
        });
      }
    }

    this.logger.debug(
      `${dbOrder.SeaportOrderAssets[0].token} #${dbOrder.SeaportOrderAssets[0].identifierOrCriteria} transfer ${quantity} from ${fromAddress} to ${toAddress}`,
    );
  }

  getChainContractsProgress(chainId: number) {
    return this.chainContractsProgress[chainId];
  }

  getChainContractProgress(chainId: number, contractAddress: string) {
    return this.chainContractsProgress[chainId].find(
      (e) => e.contractAddress.toLowerCase() === contractAddress.toLowerCase(),
    );
  }

  getChainContractsProgressAllFinished(chainId: number) {
    return this.chainContractsProgress[chainId].every((e) => e.isFinished);
  }

  async waitForChainAllContractProgressIsFinished(
    chainId: number,
  ): Promise<void> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const allChainsFinished =
          this.getChainContractsProgressAllFinished(chainId);

        if (allChainsFinished) {
          clearInterval(interval);
          resolve();
        }
      }, 1000);
    });
  }

  setChainContractProgress(
    chainId: number,
    contractAddress: string,
    option: {
      isRunning?: boolean;
      isFinished?: boolean;
      blockNumber?: number;
    },
  ) {
    const index = this.chainContractsProgress[chainId].findIndex(
      (e) => e.contractAddress.toLowerCase() === contractAddress.toLowerCase(),
    );
    if (index === -1) {
      null;
    } else {
      this.chainContractsProgress[chainId][index] = {
        contractAddress: contractAddress,
        // if has value, use value, otherwise don't change
        isRunning:
          option.isRunning ??
          this.chainContractsProgress[chainId][index].isRunning,
        isFinished:
          option.isFinished ??
          this.chainContractsProgress[chainId][index].isFinished,
        blockNumber:
          option.blockNumber ??
          this.chainContractsProgress[chainId][index].blockNumber,
      };
    }
  }
}
