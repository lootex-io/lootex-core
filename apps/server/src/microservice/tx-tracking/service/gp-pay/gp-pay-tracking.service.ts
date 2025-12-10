import { Injectable, Logger } from '@nestjs/common';
import {
  RpcCall,
  RpcHandlerService,
} from '@/core/third-party-api/rpc/rpc-handler.service';
import { ethers } from 'ethers';
import { GP_PURCHASE_PROJECTS } from '@/microservice/event-poller-gp/constants';
import { TxTrackingGPPayData } from '@/microservice/tx-tracking/tx-tracking-constants';
import { GpTxEvent } from '@/model/entities/constant-model';
import { InjectModel } from '@nestjs/sequelize';
import { AccountGpBalanceHistory } from '@/model/entities/gp/account-gp-balance-history.entity';
import { GpDao } from '@/core/dao/gp-dao';
import { Op } from 'sequelize';

/**
 * GP Pay 追踪： 过期 GP Pay 消费 退回
 */
@Injectable()
export class GpPayTrackingService {
  private readonly eventFilter;
  private logger = new Logger(GpPayTrackingService.name);
  constructor(
    @InjectModel(AccountGpBalanceHistory)
    private accountGpBalanceHistoryRepository: typeof AccountGpBalanceHistory,
    private readonly rpcHandlerService: RpcHandlerService,
    private readonly gpDao: GpDao,
  ) {
    this.eventFilter = {
      topics: [
        [
          ethers.utils.id(
            'DelegateBuyExecuted(address[],address,uint256[],uint256[],uint256[],uint256[],bytes[][])',
          ),
        ],
      ],
    };
    // this.handleTrackingEvent({
    //   chainId: 8453,
    //   accountId: 'cb8b79a0-f1dd-4b24-b1a4-8c8f84aa8027',
    //   walletAddress: '0x32304d696e52f2bbf2f71426a76af8ccf7aea99c',
    //   endTime: 1735116140,
    //   fromBlockNumber: 24163246,
    //   consumeGp: 4,
    //   signatures: [
    //     '0xa6732e5cd615e6a465eb8be89d94606a6b5fc55270a8e77277727164fd012bf1547e92034d388dde4243b6e18960177194988714742d3b5ec9ac5a2cb0017b721c',
    //     '0x351733f619c4072e0a629ddd8c2a5fbcc8c8b775848c934870933b968d44edb76dcc30251dc8aa80686e4da6bea564690576621d97879804ee75cc5b621c29fe1c',
    //     '0xb5f03f766904c4a9cf47c0da5f2c84dcbdd4efca9a440a95fe3e4ca0d888c31508ea1cf97e2140150e763e538486205454a29eaaafd73be30d978575ca38a8aa1c',
    //   ],
    // });
  }

  @RpcCall({ chainIdFn: (args) => args[0].chainId, undefinedRetry: false })
  async handleTrackingEvent(params: TxTrackingGPPayData) {
    this.logger.log(`handleTrackingEvent ${JSON.stringify(params)}`);
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      params.chainId,
    );
    const toBlockNumber = await this.getBlockNumberByTimestamp(
      provider,
      params.endTime,
      params.fromBlockNumber,
    );

    const contractConfig = GP_PURCHASE_PROJECTS.find(
      (e) => e.chainId == params.chainId,
    );
    const contract = new ethers.Contract(
      contractConfig.contractAddress,
      contractConfig.abi,
      provider,
    );
    this.logger.debug(
      `handleTrackingEvent queryFilter ${params.fromBlockNumber}-${toBlockNumber}`,
    );
    const events = await contract.queryFilter(
      this.eventFilter,
      params.fromBlockNumber,
      toBlockNumber,
    );
    const history = await this.accountGpBalanceHistoryRepository.findOne({
      where: {
        chain: params.chainId,
        event: GpTxEvent.TRANSACTION,
        transactionSender: params.walletAddress.toLowerCase(),
        'args.endTime': params.endTime,
        args: {
          [Op.contains]: {
            signatures: params.signatures,
          },
        },
      },
    });
    if (!history) {
      this.logger.log(
        `handleTrackingEvent GP pay history not found. ${JSON.stringify(params)}`,
      );
      return;
    }
    if (history.txStatus != null) {
      this.logger.log(
        `GP pay checked ${history.txStatus} ${history.txHash} ${JSON.stringify(params)}`,
      );
      return;
    }
    if (events) {
      for (const event of events) {
        const gpPayloads = await this.parseGpPayEvent(contract, event);
        console.log('gpPayloads ', gpPayloads);
        for (const gpPayData of gpPayloads) {
          if (
            gpPayData &&
            gpPayData.sender.toLowerCase() ==
              params.walletAddress.toLowerCase() &&
            gpPayData.consumedGp == params.consumeGp.toString() &&
            gpPayData.endTime == params.endTime &&
            gpPayData.signature.join(',') == params.signatures.join(',') &&
            gpPayData.txStatus == 1
          ) {
            // 找到链上交易的gp pay记录
            this.logger.log(
              `GP pay checked.${JSON.stringify(params)} ${gpPayData.txHash} ${gpPayData.txStatus}`,
            );
            const data = {
              chainId: params.chainId,
              txHash: gpPayData.txHash,
              sender: gpPayData.sender,
              gpAmount: params.consumeGp,
              endTime: gpPayData.endTime,
              txStatus: gpPayData.txStatus,
              signatures: params.signatures,
            };
            await this.gpDao.notifyPaymentTransactionHistory(data);
            return;
          }
        }
      }
    }
    this.logger.log(`GP pay Refund. ${JSON.stringify(params)}`);
    await this.gpDao.notifyRefundPaymentTransactionHistory(history);
    // const success = await this.gpDao.createPaymentTransactionHistory({
    //   chainId: params.chainId,
    //   accountId: params.accountId,
    //   transactionSender: params.walletAddress.toLowerCase(),
    //   amount: Math.abs(params.consumeGp).toString(),
    //   note: 'GP pay Refund',
    //   args: { ...params, signatures: [] },
    // });
  }

  async parseGpPayEvent(seaport: ethers.Contract, event: ethers.Event) {
    const parsedEvent = seaport.interface.parseLog(event);
    const data: {
      txHash: string;
      sender: string;
      consumedGp: string;
      signature: string[];
      endTime: number;
      txStatus: number;
    }[] = [];
    if (parsedEvent.name === 'DelegateBuyExecuted') {
      console.log('args ', parsedEvent.args);
      const txHash = event.transactionHash;
      const txStatus = (await event.getTransactionReceipt()).status;
      const consumedGps = parsedEvent.args['consumedGp'].toString().split(',');
      const signatures = parsedEvent.args['adminSignature']
        .toString()
        .split(',');
      for (let i = 0; i < consumedGps.length; i++) {
        const consumedGp = consumedGps[i];
        const payload = {
          txHash: txHash,
          sender: parsedEvent.args['requester'].toString(),
          consumedGp: consumedGp,
          signature: signatures.slice(i * 3, i * 3 + 3),
          endTime: parseInt(parsedEvent.args['endTime'].toString()),
          txStatus: txStatus,
        };
        data.push(payload);
      }
      return data;
    }
  }

  /**
   * 根据endTimestamp, fromBlock, 最快返回filter方法参数toBlock。toBlock - fromBlock 不大于200，不需要算精确的toBlock,优先返回
   * @param provider
   * @param targetTimestamp
   */
  async getBlockNumberByTimestamp(
    provider: ethers.providers.StaticJsonRpcProvider,
    endTime: number, // 单位: 秒
    fromBlockNumber = 0,
  ) {
    const startBlockNumber = fromBlockNumber;
    const latestBlockNumber = await provider.getBlockNumber();
    if (latestBlockNumber - startBlockNumber <= 200) {
      // 如果当前block区间小于200，直接返回
      return latestBlockNumber;
    }
    let toBlock = fromBlockNumber;
    while (true) {
      toBlock = toBlock + 100;
      if (toBlock >= latestBlockNumber) {
        return latestBlockNumber;
      }
      const block = await provider.getBlock(toBlock);
      const blockTimestampSec = block.timestamp * 1000 * 1000;
      this.logger.debug(`blockTimestampSec ${blockTimestampSec}`);
      if (blockTimestampSec > endTime) {
        return toBlock;
      }
    }
  }
}
