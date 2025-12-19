// import { Injectable, Logger } from '@nestjs/common';
// import {
//   NFTThirdParty,
//   OnNFTThirdPageFetched,
//   TPSContractMetadata,
//   TPSNft,
//   TPSNftsResp,
// } from '@/core/third-party-api/gateway/interface';
// import { ContractType } from '@/core/third-party-api/gateway/constants';
// import { HttpService } from '@nestjs/axios';
// import { ConfigurationService } from '@/configuration';
// import {
//   Env,
//   MAX_LIMIT,
//   MoralisQueryFlag,
//   MoralisQueryFormat,
// } from '@/core/third-party-api/moralis/constants';
// import { firstValueFrom } from 'rxjs';
// import {
//   Contract,
//   Nft,
//   Owner,
// } from '@/core/third-party-api/gateway/gateway.interface';
// import { ThirdPartyUtil } from '@/core/third-party-api/util/third-party.util';
// import { Chain } from '@/common/libs/libs.service';
// import { ImportCollectionLogService } from '@/core/import-collection-log/import-collection-log.service';
// import {
//   MoralisCollectionStatus,
//   MoralisNftStatus,
// } from '../moralis/interface';
// import { CLOUDWATCH_LOGS } from '@/common/utils';
// import { CWLogService } from '@/core/third-party-api/cloudwatch-log/cw-log.service';
// import { CacheService } from '@/common/cache';
// import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';
// import { LOG_TYPE, LogService } from '@/core/log/log.service';
//
// @Injectable()
// export class CovalentService implements NFTThirdParty {
//   static MAX_PAGE_SIZE = 25; // 每页最大值
//   static MAX_COLLECTION_SIZE = 20000; // collection导入的nft最大值
//   static MAX_COUNT_MAIN_API_KEY = 100000; // 默认 api key 最大使用量
//   private readonly logger = new Logger(CovalentService.name);
//   private readonly host: string;
//   private apiKey: string;
//
//   constructor(
//     private readonly httpService: HttpService,
//     private readonly configService: ConfigurationService,
//     private readonly logService: LogService,
//     private readonly cacheService: CacheService,
//   ) {
//     this.host = this.configService.get(Env.COVALENT_URL);
//     this.apiKey = this.configService.get(Env.COVALENT_API_KEY);
//     this.logger.debug(`host ${this.host}, apiKey ${this.apiKey}`);
//   }
//
//   /**
//    * 根据积分使用量来切换api key
//    * @param credit
//    */
//   async autoSwitchApiKey(credit: number = 1) {
//     this.apiKey = this.configService.get(Env.COVALENT_API_KEY);
//     const generateCacheKey = (apiKey: string) =>
//       `covalent_used_count:${this.apiKey}_${new Date().getFullYear()}_${
//         new Date().getMonth() + 1
//       }_1`;
//     // check and auto switch api key
//     let cacheKey = generateCacheKey(this.apiKey);
//     let count = await this.cacheService.getCache<number>(cacheKey);
//     if (count == null) {
//       count = 0;
//     }
//     const apiBackupKey = this.configService.get(Env.COVALENT_API_BACKUP_KEY);
//     if (
//       count > CovalentService.MAX_COUNT_MAIN_API_KEY &&
//       apiBackupKey &&
//       apiBackupKey.length > 0
//     ) {
//       // this.logService.log(LOG_TYPE.COMMON, 'covalent-switch-backup-key');
//       this.apiKey = this.configService.get(Env.COVALENT_API_BACKUP_KEY);
//       cacheKey = generateCacheKey(this.apiKey);
//       count = await this.cacheService.getCache<number>(cacheKey);
//     } else {
//       // this.logService.log(LOG_TYPE.COMMON, 'covalent-switch-default-key');
//     }
//     count = count + credit;
//     // cache data for 100 days
//     await this.cacheService.setCache(cacheKey, count, 100 * 86400);
//   }
//
//   async _fetch(url: string) {
//     this.logger.debug(`url ${url}`);
//     let apiKey = this.apiKey;
//     let retry = 5;
//     while (retry > 0) {
//       const requestConfig = {
//         headers: {
//           Authorization: `Bearer ${apiKey}`,
//         },
//       };
//       const response = await firstValueFrom(
//         this.httpService.get(url, requestConfig),
//       );
//
//       if (response.status >= 299 || response.status < 200) {
//         throw new Error(
//           `[${JSON.stringify(
//             response.request,
//             null,
//             4,
//           )}] error, reason: ${JSON.stringify(response.data, null, 4)}`,
//         );
//       } else if (response.status === 429) {
//         this.logger.log('_fetch 429');
//         const apiBackupKey = this.configService.get(
//           Env.COVALENT_API_BACKUP_KEY,
//         );
//         if (apiBackupKey == apiKey) {
//           return null;
//         } else {
//           // replace with backup key
//           apiKey = apiBackupKey;
//           retry--;
//           continue;
//         }
//       } else {
//         return response.data;
//       }
//     }
//   }
//
//   @logRunDuration(new Logger(CovalentService.name))
//   getNftOwnersByTokenId(
//     chain: Chain,
//     contractAddress: string,
//     tokenId: string | number,
//   ): Promise<TPSNftsResp> {
//     // covalent cannot get number of nft owners.
//     return Promise.resolve(undefined);
//   }
//
//   @logRunDuration(new Logger(CovalentService.name))
//   async getNftsByContract(
//     chain: Chain,
//     contractAddress: string,
//     limit = CovalentService.MAX_PAGE_SIZE,
//     cursor = '',
//     format: MoralisQueryFormat,
//     onPage?: OnNFTThirdPageFetched,
//   ): Promise<TPSNftsResp> {
//     this.logService.log(LOG_TYPE.COVALENT, 'getNftsByContract', {
//       contractAddress,
//       chain,
//     });
//
//     await this.autoSwitchApiKey(15);
//     let page = 0;
//     const pageSize =
//       limit > CovalentService.MAX_PAGE_SIZE
//         ? CovalentService.MAX_PAGE_SIZE
//         : limit;
//     let totalCount = 0;
//     const nfts: TPSNft[] = [];
//     let hasMore = true;
//     do {
//       const query = {
//         'no-metadata': 'true',
//         'page-size': pageSize.toString(),
//         'page-number': page.toString(),
//         'with-uncached': 'true',
//       };
//       const url = `${this.host}/v1/${this._mapChainName(
//         chain,
//       )}/nft/${contractAddress}/metadata/?${new URLSearchParams(query)}`;
//
//       const res = await this._fetch(url);
//       totalCount = res['data']['pagination']['total_count'];
//       const pageNumber = res['data']['pagination']['page_number'];
//
//       const collections = res['data']['items'];
//       const tempNfts: TPSNft[] = [];
//       for (const collection of collections) {
//         tempNfts.push(...this._parseCollection(collection, false));
//       }
//       nfts.push(...tempNfts);
//       await this._executeOnPageFetchTask(page, tempNfts, onPage);
//
//       const nftSize = pageNumber * pageSize + collections.length;
//       if (nftSize >= CovalentService.MAX_COLLECTION_SIZE) {
//         this.logger.debug(
//           `The maximum number(${CovalentService.MAX_COLLECTION_SIZE}) of NFTs for importing collection has been reached. current nftSize ${nftSize}`,
//         );
//         break;
//       }
//       if (nftSize >= totalCount) {
//         hasMore = false;
//       }
//       page = pageNumber;
//       page++;
//     } while (hasMore);
//     const result = {
//       total: totalCount,
//       cursor: '',
//       result: nfts,
//     };
//     this.logger.debug(`getNftsByContract ${result}`);
//     return Promise.resolve(result);
//   }
//
//   @logRunDuration(new Logger(CovalentService.name))
//   async getSupplyByContract(
//     chain: Chain,
//     contractAddress: string,
//   ): Promise<number> {
//     this.logService.log(LOG_TYPE.COVALENT, 'getSupplyByContract', {
//       contractAddress,
//       chain,
//     });
//
//     await this.autoSwitchApiKey(15);
//     const query = {
//       'no-metadata': 'true',
//       'with-uncached': 'true',
//     };
//     const url = `${this.host}/v1/${this._mapChainName(
//       chain,
//     )}/nft/${contractAddress}/metadata/?${new URLSearchParams(query)}`;
//     const res = await this._fetch(url);
//     const totalCount = res['data']['pagination']['total_count'];
//     this.logger.debug(`getSupplyByContract ${totalCount}`);
//     return Promise.resolve(totalCount);
//   }
//
//   @logRunDuration(new Logger(CovalentService.name))
//   getContractMetadata(
//     chain: Chain,
//     contractAddress: string,
//   ): Promise<TPSContractMetadata | undefined> {
//     return undefined;
//   }
//
//   @logRunDuration(new Logger(CovalentService.name))
//   async getNftsByOwner(
//     chain: Chain,
//     owner: string,
//     limit = -1,
//     cursor = '',
//     onPageFetch?: OnNFTThirdPageFetched,
//   ): Promise<TPSNftsResp> {
//     this.logService.log(LOG_TYPE.COVALENT, 'getNftsByOwner', {
//       owner,
//       chain,
//     });
//
//     await this.autoSwitchApiKey(1);
//     const query = { 'with-uncached': 'true' };
//     const url = `${this.host}/v1/${this._mapChainName(
//       chain,
//     )}/address/${owner}/balances_nft/?${new URLSearchParams(query)}`;
//     const res = await this._fetch(url);
//     const collections = res['data']['items'];
//     const nfts: TPSNft[] = [];
//     for (const collection of collections) {
//       nfts.push(...this._parseCollection(collection));
//     }
//     const result = {
//       total: nfts.length,
//       cursor: '',
//       result: nfts,
//     };
//     await this._executeOnPageFetchTask(0, nfts, onPageFetch);
//     this.logger.debug(`getNftsByOwner ${JSON.stringify(result)}`);
//     return Promise.resolve(result);
//   }
//
//   @logRunDuration(new Logger(CovalentService.name))
//   getNFTsByContract(
//     chain: Chain,
//     contractAddress: string,
//     limit: number,
//     cursor: string,
//     format: MoralisQueryFormat,
//     onPage?: OnNFTThirdPageFetched,
//   ): Promise<TPSNftsResp> {
//     return this.getNftsByContract(
//       chain,
//       contractAddress,
//       CovalentService.MAX_PAGE_SIZE,
//       '',
//       MoralisQueryFormat.DECIMAL,
//       onPage,
//     );
//   }
//
//   @logRunDuration(new Logger(CovalentService.name))
//   getTokenIdTotalOwners(
//     chain: Chain,
//     contractAddress: string,
//     tokenId: string,
//     limit: number,
//     format: MoralisQueryFormat,
//   ): Promise<string> {
//     // covalent cannot get number of nft owners. set the default value to 1;
//     return Promise.resolve('1');
//   }
//
//   syncContract(chain: Chain, contractAddress: string) {
//     // covalent no sync function.
//     return Promise.resolve(true);
//   }
//
//   syncMetadataByTokenIdsByContract(
//     chain: Chain,
//     contractAddress: string,
//     tokenIds: string[],
//     flag: MoralisQueryFlag,
//   ): void {
//     // covalent no sync function.
//   }
//
//   getCollectionStats(
//     chain: Chain,
//     contractAddress: string,
//   ): Promise<MoralisCollectionStatus> {
//     // covalent no this function.
//     return undefined;
//   }
//
//   getNftStatus(
//     chain: Chain,
//     contractAddress: string,
//     tokenId: string,
//   ): Promise<MoralisNftStatus> {
//     // covalent no this function.
//     return undefined;
//   }
//
//   _mapChainName(chain: Chain) {
//     if (chain === Chain.MANTLE) {
//       return 'mantle-mainnet';
//     }
//   }
//
//   _parseCollection(collection: any, many = true) {
//     const result: TPSNft[] = [];
//     if (collection['nft_data']) {
//       if (many) {
//         for (const item of collection['nft_data']) {
//           result.push(this._parseNft(collection, item));
//         }
//       } else {
//         result.push(this._parseNft(collection, collection['nft_data']));
//       }
//     }
//     return result;
//   }
//
//   _parseNft(collection, item: any): TPSNft {
//     const owner: Owner = {
//       ownerAddress: item['owner_address'],
//       amount: null,
//     };
//     const contract: Contract = {
//       contractAddress: collection['contract_address'],
//       name: collection['contract_name'],
//       symbol: collection['contract_ticker_symbol'],
//       contractType: this._parseContractType(
//         `${collection['supports_erc']}+${item['supports_erc']}`,
//       ),
//     };
//     const nft: TPSNft = {
//       tokenId: item['token_id'],
//       tokenUri: item['token_url'],
//       contract: contract,
//       owner: owner,
//       metadata: item['external_data'],
//       totalAmount: null, // covalent 拿不到
//       isSpam: false,
//     };
//     return nft;
//   }
//
//   _parseContractType(type) {
//     if (type) {
//       type = type.toString().toUpperCase();
//       this.logger.debug(`_parseContractType ${type}`);
//       if (type.indexOf(ContractType.ERC721.toString()) > -1) {
//         return ContractType.ERC721;
//       } else if (type.indexOf(ContractType.ERC1155.toString()) > -1) {
//         return ContractType.ERC1155;
//       }
//     }
//     return ContractType.UNKNOWN;
//   }
//   async _executeOnPageFetchTask(
//     page: number,
//     nfts: Nft[],
//     onPageFetched: OnNFTThirdPageFetched,
//   ) {
//     if (onPageFetched) {
//       try {
//         await onPageFetched(
//           page,
//           nfts.map((e) => ThirdPartyUtil.convertTPSNftToNft(e)),
//         );
//       } catch (e) {
//         this.logger.error(`onPage error. ${e}`);
//       }
//     }
//   }
// }
