import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigurationService } from '@/configuration';
import { firstValueFrom } from 'rxjs';
import { jsonToUrlParam } from '@/common/utils/utils.pure';
import { sleep } from 'typescript-retry-decorator/dist/utils';
import { OpenSeaUtil } from '@/core/aggregator-core/opensea/opensea.util';
import { Cacheable } from '@/common/decorator/cacheable.decorator';

/**
 * opensea api请求限制：4 request per sec and 2 post per sec. (测试环境)
 */
@Injectable()
export class OpenSeaApiService {
  private readonly logger = new Logger(OpenSeaApiService.name);
  private readonly apiApi;
  private readonly apiKeys: string[];
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigurationService,
  ) {
    this.apiApi = this.configService.get<string>('OPENSEA_API');
    this.apiKeys = this.configService.get<string>('OPENSEA_API_KEY').split(',');

    this.logger.log(`apiApi ${this.apiApi} apiKeys ${this.apiKeys} `);

    // this.getCollection('ai-svg-creative').then((data) =>
    //   console.log('ssss ', data),
    // );
  }

  async _request(url: string, config?: { method: 'post' | 'get'; data: any }) {
    let retry = 5;
    let apiKeyIndex = 0;
    while (retry > 0) {
      const xApiKey = this.apiKeys[apiKeyIndex % this.apiKeys.length];
      this.logger.log(
        `_fetch ${url} apiKeyIndex: ${apiKeyIndex} xApiKey: ${xApiKey}`,
      );
      const requestConfig = {
        headers: {
          Host: `api.opensea.io`,
          accept: `application/json`,
          'x-api-key': `${xApiKey}`,
        },
      };
      let response;
      if (config && config.method === 'post') {
        response = await firstValueFrom(
          this.httpService.post(url, config.data ?? {}, requestConfig),
        );
      } else {
        response = await firstValueFrom(
          this.httpService.get(url, requestConfig),
        );
      }

      if (response.status >= 299 || response.status < 200) {
        throw new Error(
          `[${JSON.stringify(
            response.request,
            null,
            4,
          )}] error, reason: ${JSON.stringify(response.data, null, 4)}`,
        );
      } else if (response.status === 429) {
        this.logger.log(`${url} _fetch 429`);
        retry--;
        apiKeyIndex++;
        continue;
      } else {
        return response.data;
      }
    }
  }

  /**
   *
   * @param collection slug
   * @param startTime 时间戳，秒
   * @param endTime 时间戳，秒
   * @param onPageSuccess
   */
  async importCollectionEvents(
    collection: string,
    startTime: string,
    endTime: string,
    onPageSuccess: (events: any) => Promise<void>,
  ) {
    this.logger.log('importCollectionEvents start.');
    if (parseInt(endTime) - parseInt(startTime) > 3600 * 12) {
      // 如果区间时间超过12小时，事件太多，这里不处理，直接跳过
      this.logger.log('importCollectionEvents > 12h, skip this period events.');
      await onPageSuccess([]);
      return;
    }

    // const eventTypeParam =
    //   'event_type=cancel&event_type=sale&event_type=transfer';
    const eventTypeParam =
      'event_type=cancel&event_type=listing&event_type=sale&event_type=transfer';
    const url = `${this.apiApi}/api/v2/events/collection/${collection}`;
    const data = [];
    let next = '';
    do {
      const params = { next, after: startTime, before: endTime };

      const res = await this._request(
        `${url}?${jsonToUrlParam(params)}&${eventTypeParam}`,
      );
      const listings = res.asset_events;
      data.push(...listings);
      next = res.next;
      console.log(`data.length ${data.length} ${next}`);
      await sleep(1000);
    } while (next);
    this.logger.log('importCollectionEvents end.');
    // sort ， event_timestamp 正序, event_type为sale优先。
    // fulfill行为会依次触发sale, transfer事件
    data.sort((a, b) => {
      if (a.event_timestamp != b.event_timestamp) {
        return a.event_timestamp - b.event_timestamp;
      }
      if (a.event_type === 'sale') {
        return -1;
      }
      return 0;
    });
    await onPageSuccess(data);
  }

  /**
   *
   * @param collection slug
   * @param startTime 时间戳，秒
   * @param endTime 时间戳，秒
   * @param onPageSuccess
   */
  async importNFTEvents(
    chainId: number,
    contractAddress: string,
    tokenId: string,
    startTime: string,
    endTime: string,
    onPageSuccess: (events: any) => Promise<void>,
  ) {
    this.logger.log('importNFTEvents start. ');
    // if (parseInt(endTime) - parseInt(startTime) > 3600 * 12) {
    //   // 如果区间时间超过12小时，事件太多，这里不处理，直接跳过
    //   this.logger.log('importNFTEvents > 12h, skip this period events.');
    //   await onPageSuccess([]);
    //   return;
    // }
    const eventTypeParam =
      'event_type=cancel&event_type=sale&event_type=transfer';
    // const params =
    //   'event_type=cancel&event_type=listing&event_type=sale&event_type=transfer';
    const url = `${this.apiApi}/api/v2/events/chain/${OpenSeaUtil.convertChainStr(chainId)}/contract/${contractAddress.toLowerCase()}/nfts/${tokenId}`;
    const data = [];
    let next = '';
    do {
      const params = { next, after: startTime, before: endTime };

      const res = await this._request(
        `${url}?${jsonToUrlParam(params)}&${eventTypeParam}`,
      );
      const listings = res.asset_events;
      data.push(...listings);
      next = res.next;
      console.log(`data.length ${data.length} ${next}`);
      await sleep(1000);
    } while (next);
    this.logger.log('importNFTEvents end.');
    // sort ， event_timestamp 正序, event_type为sale优先。
    // fulfill行为会依次触发sale, transfer事件
    data.sort((a, b) => {
      if (a.event_timestamp != b.event_timestamp) {
        return a.event_timestamp - b.event_timestamp;
      }
      if (a.event_type === 'sale') {
        return -1;
      }
      return 0;
    });
    await onPageSuccess(data);
  }

  async importCollectionBestListings(collection: string, onPageSuccess) {
    this.logger.log(`${collection} importCollectionBestListings start.`);
    // const url = `${this.apiApi}/api/v2/listings/collection/${collection}/best`;
    const url = `${this.apiApi}/api/v2/listings/collection/${collection}/all`;
    let next = '';
    do {
      let urlParams = '';
      if (next && next !== '') {
        urlParams = '?' + jsonToUrlParam({ next });
      }

      const res = await this._request(`${url}${urlParams}`);
      const listings = res.listings;
      await onPageSuccess(listings);
      next = res.next;

      await sleep(3000);
    } while (next);
    this.logger.log(`${collection} importCollectionBestListings end.`);
  }

  /**
   * 通过api获取collection info
   * 缓存时间一个月，降低api使用频率
   * @param slug
   */
  @Cacheable({
    key: 'aggregator:opensea:api:collection:info',
    seconds: 3600,
  })
  async getCollection(slug: string): Promise<{
    chainId: number;
    address: string;
    slug: string;
    safelistStatus: string;
    category: string;
    isDisabled: boolean;
    isNsfw: boolean;
    projectUrl: string;
    wikiUrl: string;
    discordUrl: string;
    telegramUrl: string;
    twitterUsername: string;
    instagramUsername: string;
  }> {
    const url = `${this.apiApi}/api/v2/collections/${slug}`;
    const res = await this._request(`${url}`);
    const contracts = res.contracts;
    if (contracts && contracts.length > 0) {
      return {
        chainId: OpenSeaUtil.convertChainId(contracts[0].chain),
        address: contracts[0].address?.toLowerCase(),
        slug: slug,
        safelistStatus: res.safelist_status || '',
        category: res.category || '',
        isDisabled: res.is_disabled || false,
        isNsfw: res.is_nsfw || false,
        projectUrl: res.project_url || '',
        wikiUrl: res.wiki_url || '',
        discordUrl: res.discord_url || '',
        telegramUrl: res.telegram_url || '',
        twitterUsername: res.twitter_username || '',
        instagramUsername: res.instagram_username || '',
      };
    }
  }

  async getBestLintingByNFT(slug: string, tokenId: string) {
    const url = `${this.apiApi}/api/v2/listings/collection/${slug}/nfts/${tokenId}/best`;
    const res = await this._request(`${url}`);
    return res;
  }

  async getAllListingsByNFT(
    chainId: number,
    contractAddress: string,
    tokenId: string,
  ) {
    this.logger.debug('getAllListingsByNFT ');
    const url = `${this.apiApi}/api/v2/orders/${OpenSeaUtil.convertChainStr(chainId)}/seaport/listings`;
    const requestData = {
      asset_contract_address: contractAddress,
      order_direction: 'asc',
      token_ids: `${tokenId}`,
      limit: '50',
    };
    const urlParams = '?' + jsonToUrlParam(requestData);
    const res = await this._request(`${url}${urlParams}`);
    let orders = res.orders ?? [];
    if (orders) {
      orders = orders.map((e) => {
        return {
          order_hash: e.order_hash,
          chain: OpenSeaUtil.convertChainStr(chainId),
          protocol_data: e.protocol_data,
          protocol_address: e.protocol_address,
        };
      });
    }
    return orders;
  }

  async getOSSignature(data: {
    orderHash: string;
    chainId: number;
    protocolAddress: string;
    fulfiller: string;
  }) {
    this.logger.debug(`getOSSignature ${JSON.stringify(data)}`);
    const url = `${this.apiApi}/api/v2/listings/fulfillment_data`;
    const requestData = {
      listing: {
        hash: data.orderHash,
        chain: OpenSeaUtil.convertChainStr(data.chainId),
        protocol_address: data.protocolAddress,
      },
      fulfiller: {
        address: data.fulfiller,
      },
    };
    const res = await this._request(`${url}`, {
      method: 'post',
      data: requestData,
    });
    this.logger.debug(
      'res ',
      JSON.stringify(res?.fulfillment_data?.transaction?.input_data),
    );
    let signature;
    if (
      res?.fulfillment_data?.orders &&
      res?.fulfillment_data?.orders.length > 0
    ) {
      signature = res?.fulfillment_data?.orders[0]?.signature;
    } else {
      signature =
        res?.fulfillment_data?.transaction?.input_data?.parameters?.signature ??
        res?.fulfillment_data?.transaction?.input_data?.order?.signature;
    }
    return signature;
  }

  async getOrderData(order: {
    chainId: number;
    orderHash: string;
    protocolAddress: string;
  }) {
    const url = `${this.apiApi}/api/v2/orders/chain/${OpenSeaUtil.convertChainStr(order.chainId)}/protocol/${order.protocolAddress}/${order.orderHash}`;
    const res = await this._request(`${url}`);
    this.logger.log(`getOrderData ${url} : ${JSON.stringify(res.order)}`);
    return res.order;
  }
}
