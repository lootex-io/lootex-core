import { Injectable, Logger } from '@nestjs/common';
import {
  AggregatorSignatureOrderDto,
  AggregatorSyncOrderDto,
} from '@/api/v3/aggregator-api/aggregator.dto';
import { OpenSeaHandlerService } from '@/core/aggregator-core/opensea/opensea-handler.service';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { AggregatorOpenSeaCollection } from '@/model/entities/aggregator/aggregator-watched-collection';
import { CacheService } from '@/common/cache';
import { SeaportOrder } from '@/model/entities';
import { OpenSeaApiService } from '@/core/aggregator-core/opensea/opensea-api.service';
import { SimpleException } from '@/common/utils/simple.util';
import { RpcHandlerService } from '@/core/third-party-api/rpc/rpc-handler.service';
import { Sequelize } from 'sequelize-typescript';
import { ORDER_PLATFORM_TYPE } from '@/microservice/nft-aggregator/aggregator-constants';
import { QueryTypes } from 'sequelize';

@Injectable()
export class AggregatorService {
  private readonly logger = new Logger(AggregatorService.name);
  constructor(
    @InjectModel(SeaportOrder)
    private readonly seaportOrderRepository: typeof SeaportOrder,
    @InjectModel(AggregatorOpenSeaCollection)
    private readonly openSeaCollectionRepository: typeof AggregatorOpenSeaCollection,
    private readonly rpcHandlerService: RpcHandlerService,
    private readonly openSeaHandlerService: OpenSeaHandlerService,
    private readonly openSeaApiService: OpenSeaApiService,
    private readonly cacheService: CacheService,
    @InjectConnection()
    private readonly sequelizeInstance: Sequelize,
  ) {}

  async status() {
    const osStatus = await this.cacheService.getCache(
      'aggregator:opensea:wss:status',
    );
    return {
      os: osStatus,
    };
  }
  async syncOrder(dto: AggregatorSyncOrderDto) {
    const collection = await this.openSeaCollectionRepository.findOne({
      where: {
        chain: dto.chainId,
        address: dto.contractAddress,
        deleted: false,
      },
    });
    if (collection) {
      const cacheKey = `aggregator:syncOrder:${dto.chainId}:${dto.contractAddress}:${dto.tokenId}`;
      if (await this.cacheService.getCache(cacheKey)) {
        return {
          synced: false,
          msg: `NFT orders has just been synchronized just now`,
        };
      }
      await this.openSeaHandlerService.syncNftOrders({
        chainId: dto.chainId,
        contractAddress: collection.address,
        tokenId: dto.tokenId,
      });
      // 同步间隔设置60s
      await this.cacheService.setCache(cacheKey, true, 1 * 60);
      return {
        synced: true,
        msg: `NFT orders has been synchronized successfully`,
      };
    }
    return { synced: false, msg: 'Not found collection of the watched list' };
  }

  async syncOsSignatures(orders: AggregatorSignatureOrderDto[]) {
    const res = [];
    for (const item of orders) {
      const orderWhere = {
        hash: item.orderHash,
        chainId: item.chainId,
      };
      const seaportOrder = await this.seaportOrderRepository.findOne({
        where: orderWhere,
      });
      if (seaportOrder) {
        if (seaportOrder.signature && seaportOrder.signature.length > 0) {
          res.push({ ...item, signature: seaportOrder.signature });
        } else {
          try {
            const signature = await this.openSeaApiService.getOSSignature({
              orderHash: item.orderHash,
              chainId: item.chainId,
              protocolAddress: item.exChangeAddress,
              fulfiller: item.fulfillerAddress,
            });
            if (signature && signature.length > 0) {
              await this.seaportOrderRepository.update(
                { signature: signature },
                { where: orderWhere },
              );
            }
            res.push({ ...item, signature: signature });
          } catch (e) {
            this.logger.debug(`Fetch Signature Error: ${e.message}`);
            throw SimpleException.error('Fetch Signature Error');
          }
        }
      } else {
        throw SimpleException.fail({
          message: 'Unable to find order data by orderHash',
        });
      }
    }
    return res;
  }

  async getCollectionNfts(slug: string) {
    const collection = await this.openSeaCollectionRepository.findOne({
      where: { slug: slug },
    });
    if (collection) {
      const needUpdatedAssetsSql = `
        select a.token_id as token_id
        from asset_extra ae
            inner join asset a on a.id = ae.asset_id
            inner join collections c on ae.collection_id = c.id
            inner join seaport_order so on so.id = ae.best_listing_order_id and so.platform_type = :platformType
        where c.chain_id = :chainId
            and c.contract_address = :contractAddress
        order by ae.best_listing_per_price ASC, so.end_time DESC;
    `;
      // 更新该collection下NFT相关最佳订单
      const assets = await this.sequelizeInstance.query(needUpdatedAssetsSql, {
        replacements: {
          chainId: collection.chain,
          contractAddress: collection.address,
          platformType: ORDER_PLATFORM_TYPE.OPENSEA,
        },
        type: QueryTypes.SELECT,
      });
      const tokenIds = assets.map((e: any) => e.token_id);
      return {
        chainId: collection.chain,
        contractAddress: collection.address,
        tokens: tokenIds,
      };
    }
    throw SimpleException.error('Parameter slug  invalid');
  }

  async reloadSlug(slug: string) {
    const cacheKey = `aggregator:reloadSlug:${slug}`;
    if (await this.cacheService.getCache(cacheKey)) {
      return { message: `reloadSlug ${slug} task in running, skip this time` };
    }
    await this.cacheService.setCache(cacheKey, true, 60 * 15);

    this.openSeaHandlerService.reloadCollectionListing([slug]);
    return { message: `reloadSlug ${slug} will be called` };
  }

  async removeSlug(slug: string) {
    const cacheKey = `aggregator:removeSlug:${slug}`;
    if (await this.cacheService.getCache(cacheKey)) {
      return { message: `removeSlug ${slug} task in running, skip this time` };
    }
    await this.cacheService.setCache(cacheKey, true, 60 * 15);

    this.openSeaHandlerService.disableCollectionOrders(slug);
    return { message: `removeSlug ${slug} will be called` };
  }

  async rpcStats() {
    const rpcCounterKeys = `counter:rpc:keys`;
    const counterKeys = await this.cacheService.getCache<string[]>(
      RpcHandlerService.RPC_COUNTER_KEYS,
    );
    const items = [];
    const itemChildren = [];
    let totalCounter = 0;
    if (counterKeys) {
      for (const counterKey of counterKeys) {
        const itemStr = await this.cacheService.getCache<string>(counterKey);
        if (!itemStr) {
          continue;
        }
        const itemObj = JSON.parse(itemStr);
        let itemTotalCounter = 0;
        for (const key of Object.keys(itemObj)) {
          itemTotalCounter += itemObj[key];
        }
        const targetClass = counterKey.substring(
          counterKey.lastIndexOf(':', counterKey.lastIndexOf(':') - 1) + 1,
          counterKey.lastIndexOf(':'),
        );
        const method = counterKey.substring(counterKey.lastIndexOf(':') + 1);

        if (method.indexOf('#') === -1) {
          totalCounter = totalCounter + itemTotalCounter;
          items.push({
            target: targetClass,
            key: method,
            counter: itemTotalCounter,
            chains: itemObj,
          });
        } else {
          itemChildren.push({
            parent: `${targetClass}.${method.split('#')[0]}`,
            item: {
              target: targetClass,
              key: method.split('#')[1],
              counter: itemTotalCounter,
              chains: itemObj,
            },
          });
        }
      }
    }
    items.sort((a, b) => b.counter - a.counter);
    // 二级
    for (const children of itemChildren) {
      const item = items.find((e) => `${e.target}.${e.key}` == children.parent);
      if (item) {
        if (!item.children) {
          item.children = [];
        }
        item.children.push(children.item);
      }
    }

    let startTime = null;
    let duration = '0 hour';
    const startST = await this.cacheService.getCache<number>(
      RpcHandlerService.RPC_COUNTER_START,
    );
    if (startST) {
      startTime = new Date(startST);
      duration =
        ((new Date().getTime() - startST) / 3600000).toFixed(2) + ' hour'; // hour
    }
    return { totalCounter, startTime: startTime?.toString(), duration, items };
  }

  async rpcStatsClean() {
    await this.rpcHandlerService.cleanCounter();
    return { message: 'ok' };
  }
}
