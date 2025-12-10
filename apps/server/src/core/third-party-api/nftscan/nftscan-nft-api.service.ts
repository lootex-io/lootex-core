import {
  BaseNftApi,
  Contract,
  Nft,
  NFT_API_NFT_LIMIT,
  NftsResp,
  OnNFTThirdPageFetched,
  Owner,
  OwnersResp,
} from '@/core/third-party-api/gateway/gateway.interface';
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigurationService } from '@/configuration';
import { LOG_TYPE, LogService } from '@/core/log/log.service';
import { firstValueFrom } from 'rxjs';
import { Env } from '@/core/third-party-api/moralis/constants';

@Injectable()
export class NftscanNftApiService extends BaseNftApi {
  static DEFAULT_LIMIT = 100; // 每页最大值
  private readonly apiKey: string;
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigurationService,
    private readonly logService: LogService,
  ) {
    super({ logger: new Logger(NftscanNftApiService.name) });
    this.apiKey = this.configService.get(Env.NFTSCAN_API_KEY);
    this.logger.debug(`apiKey ${this.apiKey}`);

    // this.getNftsByContract({
    //   chainId: 5000,
    //   contractAddress: '0x6dd13e48351b90186d2f0e5055b4c3629d9de5a1',
    //   limit: 5,
    //   onPage: (page, nfts) => {
    //     console.log(
    //       'nfts ',
    //       nfts.map((e) => JSON.stringify(e)),
    //     );
    //   },
    // }).then((res) =>
    //   console.log(
    //     'res.items ',
    //     res.result.map((e) => JSON.stringify(e)),
    //   ),
    // );

    // this.getNftsByOwner({
    //   chainId: 5000,
    //   ownerAddress: '0x7e9508950b3657e572A0aacD951f70e8172D5d05',
    //   limit: 1,
    //   onPage: (page, nfts) => {
    //     console.log(
    //       'nfts',
    //       nfts.map((e) => JSON.stringify(e)),
    //     );
    //   },
    // }).then((res) => {
    //   console.log(
    //     'res.items ',
    //     res.result.map((e) => ({
    //       contract: e.contract.contractAddress,
    //       tokenId: e.tokenId,
    //     })),
    //   );
    // });
  }

  async _fetch(url: string) {
    this.logger.debug(`url ${url}`);
    let apiKey = this.apiKey;
    let retry = 5;
    while (retry > 0) {
      const requestConfig = {
        headers: {
          'X-API-KEY': `${apiKey}`,
        },
      };
      const response = await firstValueFrom(
        this.httpService.get(url, requestConfig),
      );

      if (response.status >= 299 || response.status < 200) {
        throw new Error(
          `[${JSON.stringify(
            response.request,
            null,
            4,
          )}] error, reason: ${JSON.stringify(response.data, null, 4)}`,
        );
      } else if (response.status === 429) {
        this.logger.log('_fetch 429');
        const apiBackupKey = this.configService.get(Env.NFTSCAN_API_KEY);
        if (apiBackupKey == apiKey) {
          return null;
        } else {
          // replace with backup key
          apiKey = apiBackupKey;
          retry--;
          continue;
        }
      } else {
        return response.data;
      }
    }
  }

  async getNftsByContract(params: {
    chainId: number;
    contractAddress: string;
    limit?: number;
    nftLimit?: number;
    cursor?: string;
    onPage?: OnNFTThirdPageFetched;
  }): Promise<NftsResp> {
    const {
      chainId,
      contractAddress,
      limit = NftscanNftApiService.DEFAULT_LIMIT,
      cursor = '',
      nftLimit = NFT_API_NFT_LIMIT,
      onPage,
    } = params;
    this.logService.log(LOG_TYPE.NFTSCAN, 'getNftsByContract', {
      contractAddress,
      chainId,
    });

    let totalCount = 0;
    let newCursor = cursor;
    const nfts: Nft[] = [];
    do {
      const query = {
        show_attribute: 'false',
        limit: limit.toString(),
        sort_field: '',
        cursor: newCursor,
        sort_direction: '',
      };
      const url = `https://${this._getChainStr(
        chainId,
      )}.nftscan.com/api/v2/assets/${contractAddress}?${new URLSearchParams(
        query,
      )}`;

      const res = await this._fetch(url);
      totalCount = res['data']['total'];
      newCursor = res['data']['next'];

      const items = res['data']['content'];
      const temp: Nft[] = [];
      for (const item of items) {
        temp.push(this._parseNft(item));
      }
      nfts.push(...temp);
      try {
        await onPage(newCursor, temp);
      } catch (e) {
        this.logger.error(`onPage ${cursor} error. ${e}`);
      }
    } while (newCursor && nftLimit > nfts.length);
    return {
      total: totalCount,
      cursor: '',
      result: nfts,
    };
  }

  async getNftsByOwner(params: {
    chainId: number;
    ownerAddress: string;
    limit?: number;
    cursor?: string;
    nftLimit?: number;
    onPage?: OnNFTThirdPageFetched;
  }): Promise<NftsResp> {
    const {
      chainId,
      ownerAddress,
      limit = NftscanNftApiService.DEFAULT_LIMIT,
      cursor = '',
      onPage,
    } = params;
    this.logService.log(LOG_TYPE.NFTSCAN, 'getNftsByOwner', {
      ownerAddress,
      chainId,
    });

    // await this.autoSwitchApiKey(1);
    const query = { erc_type: '', show_attribute: 'false', sort_direction: '' };
    const url = `https://${this._getChainStr(
      chainId,
    )}.nftscan.com/api/v2/account/own/all/${ownerAddress}?${new URLSearchParams(
      query,
    )}`;
    const res = await this._fetch(url);
    const collections = res['data'];
    const items: Nft[] = [];
    for (const collection of collections) {
      items.push(...this._parseNftsFromCollection(collection));
    }
    try {
      await onPage('', items);
    } catch (e) {
      this.logger.error(`onPage ${cursor} error. ${e}`);
    }
    return {
      total: items.length,
      cursor: '',
      result: items,
    };
  }

  getOwnersByNft(params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
    limit?: number;
    cursor?: string;
  }): Promise<OwnersResp> {
    return Promise.resolve(undefined);
  }

  _getChainStr(chainId: number) {
    if (chainId == 5000) {
      return 'mantleapi';
    }
  }

  _parseNft(item, symbol?: string): Nft {
    const owner: Owner = {
      ownerAddress: item['owner'],
      amount: item['amount'],
    };
    const contract: Contract = {
      contractAddress: item['contract_address'],
      name: item['contract_name'],
      symbol: undefined,
      contractType: this.parseContractType(item['erc_type']),
    };
    let metadata = undefined;
    if (item['metadata_json']) {
      try {
        metadata = JSON.parse(item['metadata_json']);
      } catch (e) {}
    }
    const nft: Nft = {
      tokenId: item['token_id'],
      tokenUri: item['token_uri'],
      contract: contract,
      owner: owner,
      metadata: metadata,
      totalAmount: item['amount'],
      isSpam: false,
    };
    return nft;
  }

  _parseNftsFromCollection(collection): Nft[] {
    const symbol = collection['symbol'];
    const result: Nft[] = [];
    if (collection['assets']) {
      for (const item of collection['assets']) {
        result.push(this._parseNft(item, symbol));
      }
    }
    return result;
  }
}
