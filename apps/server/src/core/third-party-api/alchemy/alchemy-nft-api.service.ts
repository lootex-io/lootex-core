import { Injectable, Logger } from '@nestjs/common';
import { LOG_TYPE, LogService } from '@/core/log/log.service';
import { HttpService } from '@nestjs/axios';
import { ConfigurationService } from '@/configuration';
import { firstValueFrom } from 'rxjs';
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
import { jsonToUrlParam } from '@/common/utils/utils.pure';

@Injectable()
export class AlchemyNftApiService extends BaseNftApi {
  private readonly host: string;
  private readonly apiKey: string;
  static DEFAULT_LIMIT = 100; // 最大值
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigurationService,
    private readonly logService: LogService,
  ) {
    super({ logger: new Logger(AlchemyNftApiService.name) });
    this.host = this.configService.get('ALCHEMY_URL');
    this.apiKey = this.configService.get('ALCHEMY_API_KEY');
    this.logger.debug(`host ${this.host}, apiKey ${this.apiKey}`);

    // this.getNftsByContract({
    //   chainId: 1946,
    //   contractAddress: '0x9baafaf5dfc772ce1514cbd3ed2866778505dece',
    //   limit: 100,
    //   nftLimit: 100,
    //   onPage: (page, nfts) => {
    //     console.log(
    //       'nfts ',
    //       nfts.map((e) => e.tokenId),
    //     );
    //   },
    // }).then((res) =>
    //   console.log(
    //     'res.items ',
    //     res.result.map((e) => JSON.stringify(e)),
    //   ),
    // );

    // this.getNftsByOwner({
    //   chainId: 137,
    //   ownerAddress: '0xe2c8029957d65242a651177667a7f45b0b83fb92',
    //   limit: 5,
    //   onPage: (page, nfts) => {
    //     console.log(
    //       'nfts',
    //       nfts.map((e) => ({
    //         contract: e.contract.contractAddress,
    //         tokenId: e.tokenId,
    //       })),
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
    // this.getOwnersByNft({
    //   contractAddress: '0x39e1fc1f076cbf3202c3b39c6414a7a215a7e3be',
    //   tokenId: '5',
    //   chainId: 137,
    //   limit: 15,
    // }).then((res) => console.log(res));
  }

  async _fetch(url: string) {
    this.logger.debug(`url ${url}`);
    let apiKey = this.apiKey;
    let retry = 5;
    while (retry > 0) {
      const requestConfig = {
        headers: {},
      };
      try {
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
          const apiBackupKey = this.configService.get('ALCHEMY_API_KEY');
          // if (apiBackupKey == apiKey) {
          //   return null;
          // } else {
          // replace with backup key
          apiKey = apiBackupKey;
          retry--;
          continue;
          // }
        } else {
          return response.data;
        }
      } catch (e) {
        if (e.message.indexOf('429')) {
          this.logger.log('_fetch 429');
          const apiBackupKey = this.configService.get('ALCHEMY_API_KEY');
          // if (apiBackupKey == apiKey) {
          //   return null;
          // } else {
          // replace with backup key
          apiKey = apiBackupKey;
          retry--;
          continue;
          // }
        } else {
          throw e;
        }
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
      limit = AlchemyNftApiService.DEFAULT_LIMIT,
      cursor = '',
      nftLimit = NFT_API_NFT_LIMIT,
      onPage,
    } = params;
    this.logService.log(LOG_TYPE.ARCHEMY, 'getNftsByContract', {
      contractAddress,
      chainId,
    });
    let startToken = '';
    const items: Nft[] = [];
    do {
      const query = {
        contractAddress: contractAddress,
        withMetadata: true,
        limit: limit,
        tokenUriTimeoutInMs: 0,
        startToken: startToken,
      };
      const url = `https://${this.getAlchemyChainStr(chainId)}.g.alchemy.com/nft/v3/${this.apiKey}/getNFTsForContract?${jsonToUrlParam(query)}`;
      const res = await this._fetch(url);
      if (!res) {
        return;
      }
      if (res.nfts) {
        const tmp: Nft[] = res.nfts.map((e) => {
          return this._parseNft(e);
        });
        items.push(...tmp);
        try {
          await onPage(startToken, tmp);
        } catch (e) {
          this.logger.error(`onPage ${cursor} error. ${e}`);
        }
      }
      if (
        res.pageKey &&
        res.pageKey !== '' &&
        res.nfts &&
        res.nfts.length > 0
      ) {
        startToken = res.pageKey;
      } else {
        break;
      }
      await new Promise((resolve) => {
        setTimeout(() => {
          return resolve(null);
        }, 1000);
      });
    } while (items.length < nftLimit);
    const result = {
      total: items.length,
      cursor: startToken,
      result: items,
    };
    return Promise.resolve(result);
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
      limit = AlchemyNftApiService.DEFAULT_LIMIT,
      cursor = '',
      nftLimit = NFT_API_NFT_LIMIT,
      onPage,
    } = params;
    this.logService.log(LOG_TYPE.ARCHEMY, 'getNftsByOwner', {
      ownerAddress,
      chainId,
    });

    const nfts: Nft[] = [];
    let pageKey: string = cursor;

    do {
      const query = {
        owner: ownerAddress,
        withMetadata: true,
        pageSize: limit,
        pageKey: pageKey,
      };
      const url = `https://${this.getAlchemyChainStr(chainId)}.${this.host}/nft/v3/${this.apiKey}/getNFTsForOwner?${jsonToUrlParam(query)}`;
      const res = await this._fetch(url);
      if (!res) {
        return;
      }
      if (res.ownedNfts) {
        const tmp: Nft[] = res.ownedNfts.map((e) => {
          return this._parseNft(e);
        });
        nfts.push(...tmp);
        try {
          await onPage(pageKey, tmp);
        } catch (e) {
          this.logger.error(`onPage ${cursor} error. ${e}`);
        }
      }
      if (res.pageKey && res.pageKey !== '' && res.totalCount !== 0) {
        pageKey = res.pageKey;
      } else {
        break;
      }
      await new Promise((resolve) => {
        setTimeout(() => {
          return resolve(null);
        }, 1000);
      });
    } while (nfts.length < nftLimit);
    return {
      total: nfts.length,
      cursor: '',
      result: nfts,
    };
  }

  async getOwnersByNft(params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
    limit?: number;
    cursor?: string;
  }): Promise<OwnersResp> {
    const {
      chainId,
      contractAddress,
      tokenId,
      limit = AlchemyNftApiService.DEFAULT_LIMIT,
      cursor = '',
    } = params;
    this.logService.log(LOG_TYPE.ARCHEMY, 'getOwnersByNft', {
      contractAddress,
      chainId,
    });

    const items: Owner[] = [];
    const query = {
      contractAddress: contractAddress,
      tokenId: tokenId,
    };
    const url = `https://${this.getAlchemyChainStr(chainId)}.${this.host}/nft/v3/${this.apiKey}/getOwnersForNFT?${jsonToUrlParam(query)}`;
    const res = await this._fetch(url);
    if (res && res.owners) {
      try {
        const tmp: Owner[] = res.owners.map((e) => {
          return { ownerAddress: e };
        });
        items.push(...tmp);
      } catch (e) {
        return {
          total: 0,
          cursor: '',
          result: [],
        };
      }
    }
    return {
      total: items.length,
      cursor: '',
      result: items,
    };
  }

  getAlchemyChainStr(chainId: number) {
    if (chainId == 1946) {
      return 'soneium-minato';
    } else if (chainId == 137) {
      return 'polygon-mainnet';
    } else if (chainId == 1) {
      return 'eth-mainnet';
    } else if (chainId == 8453) {
      return 'base-mainnet';
    } else if (chainId == 43114) {
      return 'avax-mainnet';
    } else if (chainId == 1868) {
      return 'soneium-mainnet';
    }
    return '';
  }

  _parseNft(item): Nft {
    const owner: Owner = {
      ownerAddress: null,
      amount: item?.balance,
    };
    let contract: Contract = null;
    if (item.contract) {
      contract = {
        contractAddress: item.contract.address.toLowerCase(),
        name: item.contract.name,
        symbol: item.contract.symbol,
        contractType: this.parseContractType(`${item.contract.tokenType}`),
      };
    }

    return {
      tokenId: item.tokenId,
      contract: contract,
      owner: owner,
      tokenUri: item.tokenUri,
      metadata: item.raw?.metadata,
      totalAmount: item.balance,
      isSpam: false,
    };
  }
}
