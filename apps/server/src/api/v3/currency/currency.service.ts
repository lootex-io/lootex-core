import {
  ChainlinkPriceContractAddress,
  CurrencyPriceArray,
  UniswapV2PoolAddress,
  UniswapV3PoolAddress,
} from './../../../core/third-party-api/currency/constants';
import { CacheService } from '@/common/cache';
import { Blockchain, Currency, CurrencyPriceHistory } from '@/model/entities';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CurrencyService as ThirdPartyCurrencyService } from '@/core/third-party-api/currency/currency.service';
import * as promise from 'bluebird';
import { ProviderTokens } from '@/model/providers';
import { Sequelize } from 'sequelize-typescript';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { LibsDao } from '@/core/dao/libs-dao';
import { GatewayService } from '@/core/third-party-api/gateway/gateway.service';

@Injectable()
export class CurrencyService {
  protected readonly logger = new Logger(CurrencyService.name);

  constructor(
    private cacheService: CacheService,

    private thirdPartyCurrencyService: ThirdPartyCurrencyService,

    @InjectModel(CurrencyPriceHistory)
    private currencyPriceHistoryRepository: typeof CurrencyPriceHistory,

    @InjectModel(Currency)
    private currencyRepository: typeof Currency,

    @Inject(ProviderTokens.Sequelize)
    private readonly sequelize: Sequelize,

    private readonly libsDao: LibsDao,

    private readonly gatewayService: GatewayService,
  ) {}
  async getAllPairs() {
    interface PairPrice {
      symbol: string;
      price: string;
    }
    const BTCUSD: PairPrice = await this.cacheService.getCache(
      'symbol-BTCUSD-price',
    );
    const ETHUSD: PairPrice = await this.cacheService.getCache(
      'symbol-ETHUSD-price',
    );
    const BNBUSD: PairPrice = await this.cacheService.getCache(
      'symbol-BNBUSD-price',
    );
    const AVAXUSD: PairPrice = await this.cacheService.getCache(
      'symbol-AVAXUSD-price',
    );
    const MATICUSD: PairPrice = await this.cacheService.getCache(
      'symbol-MATICUSD-price',
    );
    const LOOTUSD: PairPrice = await this.cacheService.getCache(
      'symbol-LOOTUSD-price',
    );
    const MNTUSD: PairPrice = await this.cacheService.getCache(
      'symbol-MNTUSD-price',
    );
    const FRENSUSD: PairPrice = await this.cacheService.getCache(
      'symbol-FRENSUSD-price',
    );
    const USDTUSD: PairPrice = await this.cacheService.getCache(
      'symbol-USDTUSD-price',
    );
    const USDCUSD: PairPrice = await this.cacheService.getCache(
      'symbol-USDCUSD-price',
    );
    const DEFROGSUSD: PairPrice = await this.cacheService.getCache(
      'symbol-DEFROGSUSD-price',
    );
    const PFPASIAUSD: PairPrice = await this.cacheService.getCache(
      'symbol-PFPASIAUSD-price',
    );
    const MJ404USD: PairPrice = await this.cacheService.getCache(
      'symbol-MJ404USD-price',
    );
    const MYSTCLUSD: PairPrice = await this.cacheService.getCache(
      'symbol-MYSTCLUSD-price',
    );
    const ASTRUSD: PairPrice = await this.cacheService.getCache(
      'symbol-ASTRUSD-price',
    );

    return {
      BTC: BTCUSD ? BTCUSD.price : '0',
      ETH: ETHUSD ? ETHUSD.price : '0',
      BNB: BNBUSD ? BNBUSD.price : '0',
      AVAX: AVAXUSD ? AVAXUSD.price : '0',
      MATIC: MATICUSD ? MATICUSD.price : '0',
      LOOT: LOOTUSD ? LOOTUSD.price : '0',
      MNT: MNTUSD ? MNTUSD.price : '0',
      USDT: USDTUSD ? USDTUSD.price : '0',
      USDC: USDCUSD ? USDCUSD.price : '0',
      FRENS: FRENSUSD ? FRENSUSD.price : '0',
      DEFROGS: DEFROGSUSD ? DEFROGSUSD.price : '0',
      PFPASIA: PFPASIAUSD ? PFPASIAUSD.price : '0',
      MJ404: MJ404USD ? MJ404USD.price : '0',
      MYSTCL: MYSTCLUSD ? MYSTCLUSD.price : '0',
      ASTR: ASTRUSD ? ASTRUSD.price : '0',
    };
  }

  @Cacheable({
    key: 'currency-info',
    seconds: 60 * 60 * 24 * 7,
  })
  async getCurrencyByAddressAndChainId(address, chainId) {
    const currencyInfo = await this.currencyRepository.findOne({
      where: {
        address,
      },
      include: [
        {
          model: Blockchain,
          where: {
            chainId,
          },
        },
      ],
    });

    return currencyInfo;
  }

  async getPriceByCurrency(currency: Currency) {
    if (currency.isWrapped) {
      return await this.getCachePrice(currency.symbol.replace('W', '') + 'USD');
    } else if (currency.isNative) {
      return await this.getCachePrice(currency.symbol + 'USD');
    } else {
      return await this.getCachePrice(currency.symbol + 'USD');
    }
  }

  async getCachePrice(symbol: string): Promise<{
    symbol: string;
    price: string;
  }> {
    return await this.cacheService.getCache(`symbol-${symbol}-price`);
  }

  async getCachePriceByChainId(chainId: number) {
    const currency = await this.libsDao.findCurrencyByChain(chainId + '');

    return {
      currency,
      tokenPrice: await this.getCachePrice(currency.symbol + 'USD'),
    };
  }

  async getCurrencyHistory(symbol, time, limit = 50) {
    if (limit >= 50) {
      limit = 50;
    }

    // 4hour date_trunc 引用: https://stackoverflow.com/questions/69167837/how-to-group-by-every-6-hours-in-sql
    const dateTruncFunction =
      time === '4hour'
        ? `date_trunc('day', price_time) + floor(extract(hour from price_time) / 4.0) * 4 * interval '1 hour' as time,`
        : `DATE_TRUNC('${time}', price_time) AS time,`;

    const currencyPriceHistory = await this.sequelize.query(
      `
      SELECT
        ${dateTruncFunction}
        AVG(price) AS price
      FROM currency_price_history
      WHERE symbol = :symbol
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT :limit
    `,
      {
        replacements: {
          symbol,
          time,
          limit,
        },
        type: 'SELECT',
      },
    );

    return currencyPriceHistory;
  }

  async putCurrencyHistory(symbol, startTime, endTime) {
    const timestamps = this.generateTimestampsFrom(
      startTime,
      endTime,
      60 * 20 * 1000,
    );
    console.log(timestamps);
    const currencyPriceHistory = await promise.map(
      timestamps,
      async (timestamp) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // FRENS 是在 Mantle 上
        if (symbol === 'FRENSUSD') {
          const ethereumBlock = this.calculateEthBlockAtTimestamp(timestamp);
          const mantleBlock = this.calculateMantleBlockAtTimestamp(timestamp);
          const priceTime = new Date(timestamp).toISOString();
          const price = await this.thirdPartyCurrencyService.getFRENSUSDPrice(
            mantleBlock,
            ethereumBlock,
          );
          console.log(`${symbol} ${priceTime} ${price}`);
          return {
            symbol,
            price,
            priceTime,
          };
        }

        const block = this.calculateEthBlockAtTimestamp(timestamp);
        const priceTime = new Date(timestamp).toISOString();
        let price;
        switch (symbol) {
          case 'BTCUSD':
            price =
              await this.thirdPartyCurrencyService.getChainLinkOraclePrice(
                ChainlinkPriceContractAddress.BTCUSD,
                block,
              );
            break;
          case 'ETHUSD':
            price =
              await this.thirdPartyCurrencyService.getChainLinkOraclePrice(
                ChainlinkPriceContractAddress.ETHUSD,
                block,
              );
            break;
          case 'BNBUSD':
            price =
              await this.thirdPartyCurrencyService.getChainLinkOraclePrice(
                ChainlinkPriceContractAddress.BNBUSD,
                block,
              );
            break;
          case 'AVAXUSD':
            price =
              await this.thirdPartyCurrencyService.getChainLinkOraclePrice(
                ChainlinkPriceContractAddress.AVAXUSD,
                block,
              );
            break;
          case 'MATICUSD':
            price =
              await this.thirdPartyCurrencyService.getChainLinkOraclePrice(
                ChainlinkPriceContractAddress.MATICUSD,
                block,
              );
            break;
          case 'USDTUSD':
            price =
              await this.thirdPartyCurrencyService.getChainLinkOraclePrice(
                ChainlinkPriceContractAddress.USDTUSD,
                block,
              );
            break;
          case 'USDCUSD':
            price =
              await this.thirdPartyCurrencyService.getChainLinkOraclePrice(
                ChainlinkPriceContractAddress.USDCUSD,
                block,
              );
            break;
          case 'LOOTUSD':
            price = await this.thirdPartyCurrencyService.getUniSwapV2PoolPrice(
              UniswapV2PoolAddress.LOOTWETH,
              block,
            );
            break;
          case 'MNTUSD':
            price = await this.thirdPartyCurrencyService.getUniSwapV3PoolPrice(
              UniswapV3PoolAddress.MNTWETH,
              block,
            );
            break;
          case 'FRENSUSD':
            price =
              await this.thirdPartyCurrencyService.getFRENSUSDPrice(block);
            break;
          case 'DEFROGSUSD':
            price = await this.thirdPartyCurrencyService.getUniSwapV2PoolPrice(
              UniswapV2PoolAddress.DEFROGS_WETH,
              block,
              true,
            );
            break;
          case 'PFPASIAUSD':
            price = await this.thirdPartyCurrencyService.getUniSwapV2PoolPrice(
              UniswapV2PoolAddress.PFPASIA_WETH,
              block,
            );
            break;
          case 'MJ404USD':
            price = await this.thirdPartyCurrencyService.getUniSwapV2PoolPrice(
              UniswapV2PoolAddress.MJ404_WETH,
              block,
              true,
            );
            break;
          case 'MYSTCLUSD':
            try {
              const baseBlock = this.calculateBaseBlockAtTimestamp(timestamp);
              price =
                await this.thirdPartyCurrencyService.getUniSwapV3PoolPrice(
                  UniswapV3PoolAddress.MYSTCL_WETH,
                  block,
                  true,
                  8453,
                  baseBlock,
                );
              break;
            } catch (error) {
              throw new Error(error);
            }
        }
        console.log(`${symbol} ${priceTime} ${block} ${price}`);
        return {
          symbol,
          price,
          priceTime,
          block,
        };
      },
      { concurrency: 30 },
    );

    await this.currencyPriceHistoryRepository.bulkCreate(currencyPriceHistory);
    console.log(
      `putCurrencyHistory ${symbol} ${startTime} ~ ${endTime} ${currencyPriceHistory.length}`,
    );
    return true;
  }

  // 用 timestamp 找到對應的 eth block，可能會有出快速度改變而不準的問題
  // 目前只支援 Jun-01-2024 10:36:47 PM +UTC 之後的時間
  // TODO: 放去 utils 或 blockchain service 或 libs
  calculateEthBlockAtTimestamp(timestamp: number): number {
    // 1 block 12s
    // 20000000 block Jun-01-2024 10:36:47 PM +UTC
    const start = new Date('2024-06-01 22:36:47 +0').getTime(); // 明確指定 UTC 時區
    // 計算 timestamp 和 start 之間的秒數差
    const secondsDifference = Math.floor((timestamp - start) / 1000);

    // 每 12 秒一個區塊
    const blockDifference = Math.floor(secondsDifference / 12);
    const block = 20000000 + blockDifference; // 加上起始區塊數量

    return block;
  }

  calculateMantleBlockAtTimestamp(timestamp: number): number {
    // 1 block 2s
    // Mar 21 2024 16:09:00 PM (+08:00 UTC)
    // 用 2024-03-21 08:09:00 +UTC 當作起始時間，減去 timestamp 的時間，除以 2s，再加上 61439114 block(FRENS/WMNT布池時間)
    const start = new Date('2024-03-21T08:09:00').getTime();
    // timestamp - start 的分鐘數
    const minutes = Math.floor((timestamp - start) / 1000 / 60);
    // 1min/30block
    const block = 61439114 + minutes * 30;
    return block;
  }

  calculateBaseBlockAtTimestamp(timestamp: number): number {
    // 1 block 2s
    // Feb-01-2024 12:09:07 PM +UTC
    const start = new Date('2024-02-01T12:09:07Z').getTime(); // 明確指定 UTC 時區
    // console.log('start:', start); // 應該輸出 1706789347000

    // 將輸入的 timestamp 轉為可讀日期
    const date = new Date(timestamp);
    // console.log('date:', date); // 檢查 timestamp 是否正確

    const secondsDifference = Math.floor((timestamp - start) / 1000);
    // console.log('secondsDifference:', secondsDifference); // 應該是 (timestamp - 1706789347000) / 1000

    const block = 10000000 + Math.floor(secondsDifference / 2); // 每 2 秒一個區塊
    return block;
  }

  // 用二分法找到對應的 eth block，找一次可能需要 18~20 次 RPC call
  // TODO: 放去 utils 或 blockchain service 或 libs
  async findBlockByTimestamp(timestamp: number): Promise<number | null> {
    try {
      const latestBlockNumber = (
        await this.gatewayService.getBlock(1, 'latest')
      ).number;
      let start = 19000213; // Jan-13-2024 07:59:59 PM +UTC 之後，減少搜索次數
      let end = latestBlockNumber;
      let closestBlockNumber = null;
      let cnt = 0;
      while (start <= end) {
        console.log(cnt);
        cnt++;
        const mid = Math.floor((start + end) / 2);
        const block = await this.gatewayService.getBlock(1, mid);

        if (block.timestamp === timestamp) {
          return mid;
        } else if (block.timestamp < timestamp) {
          closestBlockNumber = mid;
          start = mid + 1;
        } else {
          end = mid - 1;
        }
      }
      console.log('closestBlockNumber:', closestBlockNumber);

      return closestBlockNumber;
    } catch (error) {
      this.logger.error('Error finding block by timestamp:', error);
      return null;
    }
  }

  async getFRENSUSDPrice() {
    const wMNTFRENSPrice =
      await this.thirdPartyCurrencyService.getFRENSUSDPrice();
    return wMNTFRENSPrice;
  }

  async test() {
    // const timestamps = this.generateTimestampsFrom(
    //   '2024/06/25 00:00:00',
    //   '2024/06/25 00:00:00',
    //   60 * 20 * 1000,
    // );
    return {
      MYSTCL: await this.thirdPartyCurrencyService.getUniSwapV3PoolPrice(
        '0xdf5eb97e3e23ca7f5a5fd2264680377c211310ba',
        16368126,
        true,
        8453,
      ),
      // loot: await this.thirdPartyCurrencyService.getUniSwapV2PoolPrice(
      //   UniswapV2PoolAddress.LOOTWETH,
      // ),
      // frogs: await this.thirdPartyCurrencyService.getUniSwapV2PoolPrice(
      //   UniswapV2PoolAddress.DEFROGS_WETH,
      //   'latest',
      //   true,
      // ),
      // pfp: await this.thirdPartyCurrencyService.getUniSwapV2PoolPrice(
      //   UniswapV2PoolAddress.PFPASIA_WETH,
      // ),
      // mj: await this.thirdPartyCurrencyService.getUniSwapV2PoolPrice(
      //   UniswapV2PoolAddress.MJ404_WETH,
      //   'latest',
      //   true,
      // ),
    };
  }

  async getAllPriceAtEthBlock(ethBlock: number) {
    // BTC
    const btcPrice =
      await this.thirdPartyCurrencyService.getChainLinkOraclePrice(
        ChainlinkPriceContractAddress.BTCUSD,
        ethBlock,
      );
    // ETH
    const ethPrice =
      await this.thirdPartyCurrencyService.getChainLinkOraclePrice(
        ChainlinkPriceContractAddress.ETHUSD,
        ethBlock,
      );
    // BNB
    const bnbPrice =
      await this.thirdPartyCurrencyService.getChainLinkOraclePrice(
        ChainlinkPriceContractAddress.BNBUSD,
        ethBlock,
      );
    // // MATIC
    const maticPrice =
      await this.thirdPartyCurrencyService.getChainLinkOraclePrice(
        ChainlinkPriceContractAddress.MATICUSD,
        ethBlock,
      );
    // // AVAX
    const avaxPrice =
      await this.thirdPartyCurrencyService.getChainLinkOraclePrice(
        ChainlinkPriceContractAddress.AVAXUSD,
        ethBlock,
      );
    // LOOT
    const lootPrice =
      await this.thirdPartyCurrencyService.getUniSwapV2PoolPrice(
        UniswapV2PoolAddress.LOOTWETH,
        ethBlock,
      );
    // MNT
    const mntPrice = await this.thirdPartyCurrencyService.getUniSwapV3PoolPrice(
      UniswapV3PoolAddress.MNTWETH,
      ethBlock,
    );

    return {
      BTC: btcPrice,
      ETH: ethPrice,
      BNB: bnbPrice,
      AVAX: avaxPrice,
      MATIC: maticPrice,
      LOOT: lootPrice,
      MNT: mntPrice,
    };
  }

  async recordCurrentPrice(): Promise<void> {
    const now = new Date().toISOString();

    const priceRecord: {
      symbol: string;
      price: string;
      priceTime: string;
    }[] = await promise.map(CurrencyPriceArray, async (symbol) => {
      const price = (
        await this.thirdPartyCurrencyService.getSymbolPrice(symbol)
      ).price;

      return {
        symbol,
        price,
        priceTime: now,
      };
    });

    this.logger.debug('priceRecord:', priceRecord);

    await this.currencyPriceHistoryRepository.bulkCreate(priceRecord);
  }

  // TODO: 放去 utils
  generateTimestampsFrom(
    startTime: Date,
    endTime: Date = new Date(),
    interval = 60 * 60 * 1000, // 1 hour
  ): number[] {
    const timestamps: number[] = [];
    let currentTimestamp: number = startTime.getTime();

    while (currentTimestamp <= endTime.getTime()) {
      timestamps.push(currentTimestamp);
      currentTimestamp += interval;
    }

    return timestamps;
  }
}
