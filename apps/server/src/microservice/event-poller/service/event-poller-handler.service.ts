import { Injectable, Logger } from '@nestjs/common';
import {
  BLOCK_TAG,
  COUNTER_INCREMENTED_SIGNATURE,
  ORDER_CANCELLED_SIGNATURE,
  ORDER_FULFILLED_SIGNATURE,
  ORDER_VALIDATED_SIGNATURE,
  SEAPORT_ABI,
  SeaportAddress,
} from '@/microservice/event-poller/constants';
import { ConfigurationService } from '@/configuration';
import { ChainUtil } from '@/common/utils/chain.util';
import { ethers } from 'ethers';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';
import {
  RpcCall,
  RpcHandlerService,
} from '@/core/third-party-api/rpc/rpc-handler.service';
import { LOG_TYPE, LogService } from '@/core/log/log.service';

@Injectable()
export class EventPollerHandlerService {
  private readonly logger = new Logger(EventPollerHandlerService.name);

  readonly eventFilter: ethers.EventFilter;

  constructor(
    private readonly rpcHandlerService: RpcHandlerService,
    private readonly configService: ConfigurationService,
    private logService: LogService,
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
  }

  @logRunDuration(new Logger(EventPollerHandlerService.name))
  @RpcCall({ timeout: 4, maxRetry: 2, swapStep: 1 })
  async getBlockNumber(chainId: number): Promise<number | undefined> {
    this.logService.log(LOG_TYPE.RPC_EVENT_POLLER, 'ws-getBlockNumber', {
      chainId,
    });
    const provider =
      this.rpcHandlerService.createStaticJsonRpcProvider(chainId);
    const block = await provider.getBlock(BLOCK_TAG);
    return block.number;
  }

  @logRunDuration(new Logger(EventPollerHandlerService.name))
  @RpcCall()
  async getEvents(
    chainId: number,
    fromBlock: number,
    toBlock: number,
  ): Promise<[ethers.Event[], ethers.Contract]> {
    this.logService.log(LOG_TYPE.RPC_EVENT_POLLER, 'ws-getEvents', {
      chainId,
      fromBlock,
      toBlock,
    });
    const contractAddress = SeaportAddress[ChainUtil.chainIdToChain(chainId)];
    const provider =
      this.rpcHandlerService.createStaticJsonRpcProvider(chainId);
    const seaport = new ethers.Contract(contractAddress, SEAPORT_ABI, provider);
    return [
      await seaport.queryFilter(this.eventFilter, fromBlock, toBlock),
      seaport,
    ];
  }
}
