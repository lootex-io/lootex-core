import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigurationService } from '@/configuration';
import { LOG_TYPE, LogService } from '@/core/log/log.service';
import { CacheService } from '@/common/cache';
import { firstValueFrom } from 'rxjs';
import {
  DEFAULT_LIMIT,
  Env,
  MAX_LIMIT,
  MoralisQueryFormat,
} from '@/core/third-party-api/moralis/constants';
import { ChainUtil } from '@/common/utils/chain.util';
import {
  BaseNftApi,
  ContractMetadata,
  Nft,
  NFT_API_NFT_LIMIT,
  NftsResp,
  OnNFTThirdPageFetched,
  Owner,
  OwnersResp,
} from '@/core/third-party-api/gateway/gateway.interface';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';
import { MoralisNftStatus } from '@/core/third-party-api/moralis/interface';
import { Chain } from '@/common/libs/libs.service';
import { jsonToUrlParam } from '@/common/utils/utils.pure';
import { EvmChain } from '@moralisweb3/common-evm-utils';

@Injectable()
export class MoralisNftApiService extends BaseNftApi {
  static MAX_COUNT_MAIN_API_KEY = 200000000; // 默认 api key 最大使用量 200M
  private apiKey: string;
  private readonly apiBackupKey: string;

  constructor(
    private readonly configService: ConfigurationService,
    protected readonly httpService: HttpService,
    protected readonly logService: LogService,
    protected readonly cacheService: CacheService,
  ) {
    super({ logger: new Logger(MoralisNftApiService.name) });

    this.apiKey = this.configService.get(Env.MORAILS_API_KEY);
    this.apiBackupKey = this.configService.get(Env.MORAILS_API_BACKUP_KEY);
    if (!this.apiBackupKey) {
      this.apiBackupKey = this.apiKey;
    }
    this.logger.debug(
      `apiKey ${this.apiKey} apiBackupKey ${this.apiBackupKey}`,
    );

    // this.getNftsByContract({
    //   chainId: 137,
    //   contractAddress: '0x77e4c192b6ab081584abb7d71e795663587f7324',
    //   limit: 2,
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

    // this.getNftStatus({
    //   chainId: 137,
    //   contractAddress: '0x39e1fc1f076cbf3202c3b39c6414a7a215a7e3be',
    //   tokenId: '5',
    // }).then((res) => console.log(res));
    // this.getCollectionStats({
    //   chainId: 137,
    //   contractAddress: '0x39e1fc1f076cbf3202c3b39c6414a7a215a7e3be',
    // }).then((res) => console.log(res));
    // this.getSupplyByContract({
    //   chainId: 137,
    //   contractAddress: '0x39e1fc1f076cbf3202c3b39c6414a7a215a7e3be',
    // }).then((res) => console.log(res));

    // this.getContractMetadata({
    //   chainId: 137,
    //   contractAddress: '0x39e1fc1f076cbf3202c3b39c6414a7a215a7e3be',
    // }).then((res) => console.log(res));

    // this.getNftTotalOwnersNumber({
    //   chainId: 137,
    //   contractAddress: '0x39e1fc1f076cbf3202c3b39c6414a7a215a7e3be',
    //   tokenId: '5',
    // }).then((res) => console.log(res));
  }

  @logRunDuration(new Logger(MoralisNftApiService.name))
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
      limit = DEFAULT_LIMIT,
      cursor = '',
      nftLimit = NFT_API_NFT_LIMIT,
      onPage,
    } = params;
    this.logService.log(LOG_TYPE.MORALIS, `getNftsByContract`, {
      contractAddress,
      chainId,
    });
    const items: Nft[] = [];
    let newCursor: string = cursor;

    const chain = ChainUtil.chainIdToMoralisChain(chainId);
    do {
      const urlTemplate = `api/v2.2/nft/${contractAddress}?chain=${chain}&format=${MoralisQueryFormat.DECIMAL}&limit=${limit}&cursor=${newCursor}`;

      const tmp = await this.get(urlTemplate);
      console.log('tmp ', tmp);
      const tmpNFTs = tmp.result.map((e) => this._parseNft(e));
      items.push(tmpNFTs);

      try {
        await onPage(newCursor, tmpNFTs);
      } catch (e) {
        this.logger.error(`onPage ${cursor} error. ${e}`);
      }

      if (tmp.result.length === 0) break;

      newCursor = tmp.cursor;
      if (!newCursor || tmpNFTs.length < limit || nftLimit < items.length)
        break;

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (true);

    return {
      total: items.length,
      cursor: newCursor,
      result: items,
    };
  }

  @logRunDuration(new Logger(MoralisNftApiService.name))
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
      limit = DEFAULT_LIMIT,
      cursor = '',
      nftLimit = NFT_API_NFT_LIMIT,
      onPage,
    } = params;
    this.logService.log(LOG_TYPE.MORALIS, `getNFTsByOwner`, {
      ownerAddress,
      chainId,
    });

    const chain = ChainUtil.chainIdToMoralisChain(chainId);
    const items: Nft[] = [];
    let newCursor: string = cursor;

    do {
      const url = `api/v2.2/${ownerAddress}/nft?chain=${chain}&format=${MoralisQueryFormat.DECIMAL}&limit=${limit}&cursor=${newCursor}`;
      const tmp = await this.get(url);

      const tmpNFTs = tmp.result.map((e) => this._parseNft(e));
      items.push(...tmpNFTs);

      try {
        await onPage(newCursor, tmpNFTs);
      } catch (e) {
        this.logger.error(`onPage ${cursor} error. ${e}`);
      }

      if (tmp.result.length == 0) break;

      newCursor = tmp.cursor;
      if (!newCursor || tmpNFTs.length < limit || nftLimit < items.length)
        break;

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (true);
    return { total: items.length, cursor: newCursor, result: items };
  }

  @logRunDuration(new Logger(MoralisNftApiService.name))
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
      limit = MAX_LIMIT,
      cursor = '',
    } = params;
    const chain = ChainUtil.chainIdToMoralisChain(chainId);
    this.logService.log(LOG_TYPE.MORALIS, `getTokenIdOwners`, {
      contractAddress,
      chain,
      tokenId,
    });

    const items: Owner[] = [];
    let newCursor: string = cursor;
    do {
      const url = `api/v2.2/nft/${contractAddress}/${tokenId}/owners?chain=${chain}&format=${MoralisQueryFormat.DECIMAL}&limit=${limit}&cursor=${newCursor}`;
      const tmp = await this.get(url);
      if (tmp.result.length == 0) break;

      items.push(
        ...tmp.result?.map((e) => {
          return {
            amount: e.amount,
            ownerAddress: e.owner_of,
          };
        }),
      );
      newCursor = tmp.cursor;
      if (!newCursor || tmp.result.length < limit) break;

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } while (true);

    return { total: items.length, cursor: newCursor, result: items };
  }

  @logRunDuration(new Logger(MoralisNftApiService.name))
  async getNftStatus(params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
  }): Promise<MoralisNftStatus> {
    const { chainId, contractAddress, tokenId } = params;
    this.logService.log(LOG_TYPE.MORALIS, `getNftStatus`, {
      contractAddress,
      chainId,
      tokenId,
    });
    const chain = ChainUtil.chainIdToMoralisChain(chainId);
    const urlTemplate = `api/v2.2/nft/${contractAddress}/${tokenId}/stats?chain=${chain}`;
    const res = await this.get(urlTemplate);
    return res;
  }

  async getCollectionStats(params: {
    chainId: number;
    contractAddress: string;
  }) {
    const { chainId, contractAddress } = params;
    this.logService.log(LOG_TYPE.MORALIS, `getCollectionStats`, {
      contractAddress,
      chainId,
    });

    const chain = ChainUtil.chainIdToMoralisChain(chainId);
    const urlTemplate = `api/v2.2/nft/${contractAddress}/stats?chain=${chain}`;
    const res = await this.get(urlTemplate);
    return res;
  }

  @logRunDuration(new Logger(MoralisNftApiService.name))
  async getSupplyByContract(params: {
    chainId: number;
    contractAddress: string;
  }): Promise<number> {
    try {
      const { chainId, contractAddress } = params;
      this.logService.log(LOG_TYPE.MORALIS, `getSupplyByContract`, {
        contractAddress,
        chainId,
      });
      const chain = ChainUtil.chainIdToMoralisChain(chainId);
      const collectionStatusUrlTemplate = `api/v2.2/nft/${contractAddress}/stats?chain=${chain}&format=${MoralisQueryFormat.DECIMAL}`;
      const res = await this.get(collectionStatusUrlTemplate);
      console.log('res ', res);
      return res?.total_tokens;
    } catch (e) {
      console.log('e ', e);
      return 0;
    }
  }

  @logRunDuration(new Logger(MoralisNftApiService.name))
  async getContractMetadata(params: {
    chainId: number;
    contractAddress: string;
  }): Promise<ContractMetadata | undefined> {
    const { chainId, contractAddress } = params;
    this.logService.log(LOG_TYPE.MORALIS, `getContractMetadata`, {
      contractAddress,
      chainId,
    });
    const chain = ChainUtil.chainIdToMoralisChain(chainId);
    const collectionStatusUrlTemplate = `api/v2.2/nft/${contractAddress}/metadata?chain=${chain}`;
    const contract = await this.get(collectionStatusUrlTemplate);
    return {
      contractAddress: contract.token_address,
      name: contract.name,
      symbol: contract.symbol,
      contractType: contract.contract_type,
      syncedAt: contract.synced_at,
      possibleSpam: contract.possible_spam,
      verifiedCollection: contract.verified_collection,
    };
  }

  @logRunDuration(new Logger(MoralisNftApiService.name))
  async getNftTotalOwnersNumber(params: {
    chainId: number;
    contractAddress: string;
    tokenId: string;
  }): Promise<string> {
    const { chainId, contractAddress, tokenId } = params;
    this.logService.log(LOG_TYPE.MORALIS, `getTokenIdTotalOwners`, {
      contractAddress,
      chainId,
      tokenId,
    });
    const chain = ChainUtil.chainIdToMoralisChain(chainId);
    try {
      const tokenIdStatusUrlTemplate = `api/v2.2/nft/${contractAddress}/${tokenId}/stats?chain=${chain}`;
      const res = await this.get(tokenIdStatusUrlTemplate);
      return res?.owners.current;
    } catch (e) {
      this.logger.debug(`getNftTotalOwnersNumber ${e.message}`);
      return '1';
    }
  }

  _parseNft(item: any): Nft {
    const metadata = item.metadata;
    return {
      tokenId: item.token_id,
      contract: {
        contractAddress: item.token_address,
        name: item.name,
        symbol: item.symbol,
        contractType: this.parseContractType(item.contract_type),
      },
      owner: { ownerAddress: item.owner_of, amount: item?.amount },
      tokenUri: item.token_uri,
      metadata:
        typeof metadata == 'string' && metadata.length !== 0
          ? JSON.parse(metadata)
          : metadata,
      totalAmount: item.amount,
      isSpam: item.possible_spam,
    };
  }

  // wallet stats api ------- Start --------
  /**
   * eth or 0x1
   * @param wallet
   * @param chain
   */
  @logRunDuration(new Logger(MoralisNftApiService.name))
  async getWalletStats(wallet: string, chain: string) {
    this.logService.log(LOG_TYPE.MORALIS, `getWalletStats`, {
      wallet,
      chain,
    });
    await this.autoSwitchApiKey(5);
    const path = `api/v2.2/wallets/${wallet}/stats?chain=${chain}`;
    const res = await this.get(path);
    return res;
  }

  @logRunDuration(new Logger(MoralisNftApiService.name))
  async getWalletNativeTransactions(
    wallet: string,
    chain: string,
    options: {
      start_block_number: number;
      end_block_number: number;
      cursor: any;
      include_internal_transaction: boolean;
      data_per_page: number;
    },
  ) {
    this.logService.log(LOG_TYPE.MORALIS, `getWalletNativeTransactions`, {
      wallet,
      chain,
    });

    await this.autoSwitchApiKey(5);
    const params = {
      chain: chain,
      limit: options.data_per_page,
      include: options.include_internal_transaction
        ? 'internal_transactions'
        : undefined,
      fromBlock: options.start_block_number,
      toBlock: options.end_block_number,
      cursor: options.cursor || undefined,
    };
    const paramsUrl = jsonToUrlParam(params);
    const path = `api/v2.2/${wallet}?${paramsUrl}`;
    // console.log('path ', path);
    const res = await this.get(path);
    // this.logger.debug(`getWalletStats res ${JSON.stringify(res)}`);
    return res;
  }

  @logRunDuration(new Logger(MoralisNftApiService.name))
  async getWalletNFTs(
    wallet: string,
    chain: string,
    options: {
      cursor: string;
      contract: string;
    },
  ) {
    this.logService.log(LOG_TYPE.MORALIS, `getWalletNFTs`, {
      wallet,
      chain,
    });

    await this.autoSwitchApiKey(5);
    const params = {
      chain: chain,
      'token_addresses%5B0%5D': options.contract,
      cursor: options.cursor,
      format: 'decimal',
      limit: 100,
      media_items: false,
    };
    const paramsUrl = jsonToUrlParam(params);
    const path = `api/v2.2/${wallet}/nft?${paramsUrl}`;
    // console.log('path ', path);
    const res = await this.get(path);
    return res;
  }

  @logRunDuration(new Logger(MoralisNftApiService.name))
  async getWalletActivity(wallet: string, chains: string[]) {
    this.logService.log(LOG_TYPE.MORALIS, `getWalletActivity`, {
      wallet,
      chains,
    });

    await this.autoSwitchApiKey(5);
    let chainsStr = '';
    if (
      chains.length === 1 &&
      (chains[0] === EvmChain.ETHEREUM.hex || chains[0] === Chain.ETH)
    ) {
    } else {
      chainsStr = chains
        .map((e, i) => `chains${encodeURI(`[${i}]`)}=${e}`)
        .join('&');
    }

    const path = `api/v2.2/wallets/${wallet}/chains${
      chainsStr === '' ? '' : `?${chainsStr}`
    }`;
    // console.log('path ', path);
    const res = await this.get(path);
    // this.logger.debug(`getWalletActivity res ${JSON.stringify(res)}`);
    return res;
  }

  // wallet stats api ------- End --------

  /**
   * 根据积分使用量来切换api key
   * @param credit
   */
  async autoSwitchApiKey(credit: number = 1) {
    let _apiKey = this.apiKey;
    const generateCacheKey = (key: string) =>
      `moralis_used_count:${key}_${new Date().getFullYear()}_${
        new Date().getMonth() + 1
      }_18`;
    // check and auto switch api key
    let cacheKey = generateCacheKey(_apiKey);
    let count = await this.cacheService.getCache<number>(cacheKey);
    if (count == null) {
      count = 0;
    }
    if (
      count > MoralisNftApiService.MAX_COUNT_MAIN_API_KEY &&
      this.apiBackupKey &&
      this.apiBackupKey.length > 0
    ) {
      // this.logService.log(LOG_TYPE.COMMON, 'moralis-switch-backup-key');
      _apiKey = this.apiBackupKey;
      cacheKey = generateCacheKey(_apiKey);
      count = await this.cacheService.getCache<number>(cacheKey);
    } else {
      // this.logService.log(LOG_TYPE.COMMON, `moralis-switch-default-key`);
    }
    count = count + credit;
    // cache data for 100 days
    await this.cacheService.setCache(cacheKey, count, 100 * 86400);
    this.apiKey = _apiKey;
  }

  async get(path: string, timeout = 60000, credit = 5) {
    let apiKey = this.apiKey;
    let retry = 5;
    while (retry > 0) {
      this.logger.debug(`get ${path}`);
      await this.autoSwitchApiKey(credit);
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.configService.get(Env.MORAILS_URL)}/${path}`,
          {
            headers: {
              Accept: 'application/json',
              'X-API-Key': `${apiKey}`,
            },
            timeout: timeout,
          },
        ),
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
        this.logger.log(`get 429 ${path}`);
        // replace with backup key
        apiKey = this.apiBackupKey;
        retry--;
        await new Promise((resolve) => setTimeout(resolve, 10000));
        continue;
      } else {
        return response.data;
      }
    }
  }
}
