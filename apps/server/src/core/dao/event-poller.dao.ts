import { Injectable } from '@nestjs/common';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { ethers } from 'ethers';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';

@Injectable()
export class EventPollerDao {
  constructor(protected readonly rpcHandlerService: RpcHandlerService) {}

  @Cacheable({ seconds: 5 })
  async getLatestBlockNumber(chainId: number): Promise<number> {
    this.rpcHandlerService.incrCounter(
      'EventPollerDao',
      'getLatestBlockNumber',
      chainId,
    );
    const block = await this.rpcHandlerService
      .createStaticJsonRpcProvider(chainId, RpcEnd.event)
      .getBlock('latest');
    const blockNumber = block.number;
    return blockNumber;
  }

  async queryFilter(data: {
    chainId: number;
    contract: ethers.Contract;
    eventFilter;
    fromBlock: number;
    toBlock: number;
  }) {
    this.rpcHandlerService.incrCounter(
      'EventPollerDao',
      'queryFilter',
      data.chainId,
    );
    return await data.contract.queryFilter(
      data.eventFilter,
      data.fromBlock,
      data.toBlock,
    );
  }
}
