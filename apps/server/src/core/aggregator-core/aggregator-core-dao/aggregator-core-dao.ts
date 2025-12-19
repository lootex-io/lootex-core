import { Injectable } from '@nestjs/common';
import { Asset, Blockchain, Contract, Currency } from '@/model/entities';
import { InjectModel } from '@nestjs/sequelize';
import { Cacheable } from '@/common/decorator/cacheable.decorator';

import { AWS_SQS_AGGREGATOR_EVENT_URL, QUEUE_ENV } from '@/common/utils';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AggregatorCoreDao {
  constructor(
    @InjectModel(Asset)
    private assetRepository: typeof Asset,
    @InjectModel(Currency)
    private currencyRepository: typeof Currency,
    private readonly configService: ConfigService,
  ) { }

  /**
   * 查询缓存nft
   * @param data {id, Contract:{schemaName}}
   */
  @Cacheable({ key: 'aggregator:core-dao:findNFTByToken', seconds: 3600 })
  async findNFTByToken(data: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
  }) {
    const { tokenId, chainId, contractAddress } = data;
    const asset = await this.assetRepository.findOne({
      attributes: ['id'],
      where: { tokenId: tokenId },
      include: {
        model: Contract,
        attributes: ['schemaName'],
        where: {
          chainId: chainId,
          address: contractAddress,
        },
      },
    });
    return asset;
  }

  @Cacheable({ key: 'aggregator:core-dao:findCurrency', seconds: 3600 })
  async findCurrency(data: { address: string; chainId: number }) {
    const { address, chainId } = data;
    const currency = await this.currencyRepository.findOne({
      where: {
        address: address,
      },
      include: {
        model: Blockchain,
        where: { chainId: chainId },
      },
    });
    return currency;
  }

  /**
   *
   * 发送aggregator fulfill 事件消息。
   * 处理程序收到消息后会补齐nft区间内的事件
   */
  async sendFulfillEventSqs(
    nfts: [
      {
        chainId: number;
        contractAddress: string;
        tokenId: string;
        fulfillStamp: number; // second
      },
    ],
  ) {
    // Stub: QueueService removed
    return;
  }
}
