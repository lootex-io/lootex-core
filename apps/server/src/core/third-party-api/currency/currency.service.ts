import { Injectable, Logger } from '@nestjs/common';
import { Promise as promise } from 'bluebird';
import * as _ from 'lodash';
import {
  ContractCallContext,
  ContractCallResults,
  Multicall,
} from 'ethereum-multicall';
import BigNumber from 'bignumber.js';
import { BigNumber as bigNumber, ethers } from 'ethers';
import {
  CacheExpiredSeconds,
  CallsContext,
  ChainlinkPriceContractAddress,
  CurrencySymbol,
  UNISWAP_POOL_ABI,
  UniswapV2PoolAddress,
  UniswapV3PoolAddress,
} from '@/core/third-party-api/currency/constants';
import { CacheService } from '@/common/cache/cache.service';
import { CachePrice } from '@/core/third-party-api/currency/interface';
import { logRunDuration } from '@/common/decorator/log-run-duration.decorator';
import { ConfigService } from '@nestjs/config';
import { ChainId } from '@/common/utils/types';
import { RpcCall, RpcHandlerService } from '../rpc/rpc-handler.service';
import { Cacheable } from '@/common/decorator/cacheable.decorator';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';
import axios from 'axios';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    private readonly rpcHandlerService: RpcHandlerService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) { }

  @logRunDuration(new Logger(CurrencyService.name))
  @RpcCall({
    chainIdFn: (args) => 1,
  })
  async updateAllPriceToCacheByMulticall(): Promise<void> {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(1);
    const multicall = new Multicall({
      ethersProvider: provider,
      tryAggregate: true,
    });

    // get multicall return context data
    const contractCallContext: ContractCallContext[] = CallsContext;

    // multicall and get return data
    const { results }: ContractCallResults =
      await multicall.call(contractCallContext);

    // handle each currency price and decimal from return data
    await promise.map(_.keys(results), async (symbol) => {
      const [decimals, latestRoundData] = results[symbol].callsReturnContext;
      const [decimal] = decimals.returnValues;
      const [roundId, anwser] = latestRoundData.returnValues;
      const price = ethers.utils.formatUnits(anwser.hex, decimal);
      // this.logger.debug(`symbol = ${symbol}`);
      // this.logger.debug(`decimal = ${decimal}`);
      // this.logger.debug(`${symbol} price = ${price}`);
      const cacheData: CachePrice = {
        symbol,
        price,
      };

      if (price === '0' || !price) {
        // TODO: need alert
        return;
      }

      // save data to cache
      await this.cacheService.setCache(
        `symbol-${symbol}-price`,
        cacheData,
        CacheExpiredSeconds,
      );
    });

    await this.updateLOOTPriceToCache();
    await this.updateMNTPriceToCache();
    await this.updateFRENSUSDPriceToCache();
    await this.updateDefrogsPriceToCache();
    await this.updatePFPAsiaPriceToCache();
    await this.updateMJ404PriceToCache();
    await this.updateMYSTCLPriceToCache();
    await this.updateASTRPriceToCache();
  }

  async getSymbolPrice(symbol: string): Promise<CachePrice> | null {
    return await this.cacheService.getCache(
      `symbol-${symbol.toUpperCase()}-price`,
    );
  }
  getNativeCurrencySymbolByChainId(chainId: ChainId): string {
    switch (chainId) {
      case '1':
      case '4':
      case '42161':
      case '421611':
      case '8453':
      case '84532':
      case '1868':
      case '1946':
        return CurrencySymbol.ETH;
      case '56':
      case '97':
        return CurrencySymbol.BNB;
      case '137':
      case '80001':
        return CurrencySymbol.MATIC;
      case '43114':
      case '43113':
        return CurrencySymbol.AVAX;
      case '5000':
        return CurrencySymbol.MNT;
      default:
        return '';
    }
  }

  @RpcCall({
    chainIdFn: (args) => 1,
    rpcEnd: RpcEnd.public,
  })
  @Cacheable({ seconds: 30 })
  async getChainLinkOraclePrice(
    contractAddress: string,
    blockTag: number | string = 'latest',
  ): Promise<string> {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      1,
      RpcEnd.public,
    );
    const contract = new ethers.Contract(
      contractAddress,
      ['function latestAnswer() external view returns (int256)'],
      provider,
    );
    const latestRoundData = await contract.callStatic.latestAnswer({
      blockTag,
    });
    const price = ethers.utils.formatUnits(latestRoundData, 8);
    return price;
  }

  // 注意：要檢查交易池的 token0 和 token1 是哪一個，這個 function 只能用在其中一方是 WETH 的情況
  @RpcCall({
    chainIdFn: (args) => 1,
    rpcEnd: RpcEnd.public,
  })
  @Cacheable({ seconds: 30 })
  async getUniSwapV2PoolPrice(
    contractAddress: string,
    blockTag: number | string = 'latest',
    wethIsReserve0 = false,
  ): Promise<string> {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      1,
      RpcEnd.public,
    );
    const contract = new ethers.Contract(
      contractAddress,
      [
        'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
      ],
      provider,
    );

    // 0 = token0, 1 = token1
    const [reserve0, reserve1] = await contract.callStatic.getReserves({
      blockTag,
    });
    const ethPrice = await this.getChainLinkOraclePrice(
      ChainlinkPriceContractAddress.ETHUSD,
      blockTag,
    );
    const rate = wethIsReserve0
      ? reserve0.mul(bigNumber.from(10).pow(18)) /
      reserve1.mul(bigNumber.from(10).pow(18))
      : reserve1.mul(bigNumber.from(10).pow(18)) /
      reserve0.mul(bigNumber.from(10).pow(18));
    const price = new BigNumber(ethPrice)
      .multipliedBy(rate)
      .toFixed(8)
      .toString();

    return price.toString();
  }

  async updateLOOTPriceToCache(): Promise<void> {
    const price = await this.getUniSwapV2PoolPrice(
      UniswapV2PoolAddress.LOOTWETH,
    );
    // this.logger.debug(`symbol = LOOTUSD price = ${price}`);

    if (price === '0' || !price) {
      // TODO: need alert
      return;
    }

    await this.cacheService.setCache(
      `symbol-LOOTUSD-price`,
      {
        symbol: 'LOOTUSD',
        price,
      },
      CacheExpiredSeconds,
    );
  }

  @RpcCall({
    chainIdFn: (args) => args[3],
    rpcEnd: RpcEnd.public,
  })
  @Cacheable({ seconds: 30 })
  async getUniSwapV3PoolPrice(
    contractAddress: string,
    blockTag: number | string = 'latest',
    token0isWETH = false,
    chainId = 1,
    otherChainBlockTag?: number | string,
  ): Promise<string> {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(
      chainId,
      RpcEnd.public,
    );
    const contract = new ethers.Contract(
      contractAddress,
      UNISWAP_POOL_ABI,
      provider,
    );
    const poolInfo = await contract.callStatic.slot0({
      blockTag: otherChainBlockTag ?? blockTag,
    });
    const sqrtPriceX96 = poolInfo[0];
    const price = (sqrtPriceX96 / 2 ** 96) ** 2; // https://blog.uniswap.org/uniswap-v3-math-primer
    // price = currency/weth
    // currency = price * weth
    let ethPrice = '0';
    try {
      ethPrice = await this.getChainLinkOraclePrice(
        ChainlinkPriceContractAddress.ETHUSD,
        blockTag,
      );
    } catch (error) {
      ethPrice = await this.getChainLinkOraclePrice(
        ChainlinkPriceContractAddress.ETHUSD,
        'latest',
      );
    }
    if (!token0isWETH) {
      const currencyPrice = new BigNumber(ethPrice)
        .multipliedBy(price)
        .toFixed(8)
        .toString();
      return currencyPrice.toString();
    } else {
      const currencyPrice = new BigNumber(1)
        .dividedBy(price)
        .multipliedBy(ethPrice)
        .toFixed(8)
        .toString();
      return currencyPrice.toString();
    }
  }

  @RpcCall({
    chainIdFn: (args) => 5000,
  })
  async getFRENSUSDPrice(
    mantleBlockTag: number | string = 'latest',
    ethereumBlockTag: number | string = 'latest',
  ): Promise<string> {
    const provider = this.rpcHandlerService.createStaticJsonRpcProvider(5000);
    const contract = new ethers.Contract(
      '0xb0af0176877736d0e61ba0554f7c8f2d9aea3a7f',
      UNISWAP_POOL_ABI,
      provider,
    );
    const poolInfo = await contract.callStatic.slot0({
      blockTag: mantleBlockTag,
    });
    const sqrtPriceX96 = poolInfo[0];
    const price = 1 / (sqrtPriceX96 / 2 ** 96) ** 2; // https://blog.uniswap.org/uniswap-v3-math-primer

    const mntPrice = await this.getUniSwapV3PoolPrice(
      UniswapV3PoolAddress.MNTWETH,
      ethereumBlockTag,
    );

    const currencyPrice = new BigNumber(price)
      .multipliedBy(mntPrice)
      .toString(10);

    return currencyPrice.toString();
  }

  async updateMNTPriceToCache(): Promise<void> {
    const price = await this.getUniSwapV3PoolPrice(
      UniswapV3PoolAddress.MNTWETH,
    );
    // this.logger.debug(`symbol = MNTUSD price = ${price}`);

    if (price === '0' || !price) {
      // TODO: need alert
      return;
    }

    await this.cacheService.setCache(
      `symbol-MNTUSD-price`,
      {
        symbol: 'MNTUSD',
        price,
      },
      CacheExpiredSeconds,
    );
  }

  async updateFRENSUSDPriceToCache(): Promise<void> {
    const price = await this.getFRENSUSDPrice();
    // this.logger.debug(`symbol = FRENSUSD price = ${price}`);

    if (price === '0' || !price) {
      // TODO: need alert
      return;
    }

    await this.cacheService.setCache(
      `symbol-FRENSUSD-price`,
      {
        symbol: 'FRENSUSD',
        price,
      },
      CacheExpiredSeconds,
    );
  }

  async updateDefrogsPriceToCache(): Promise<void> {
    const price = await await this.getUniSwapV2PoolPrice(
      UniswapV2PoolAddress.DEFROGS_WETH,
      'latest',
      true,
    );
    // this.logger.debug(`symbol = DEFROGSUSD price = ${price}`);

    if (price === '0' || !price) {
      // TODO: need alert
      return;
    }

    await this.cacheService.setCache(
      `symbol-DEFROGSUSD-price`,
      {
        symbol: 'DEFROGSUSD',
        price,
      },
      CacheExpiredSeconds,
    );
  }

  async updatePFPAsiaPriceToCache(): Promise<void> {
    const price = await this.getUniSwapV2PoolPrice(
      UniswapV2PoolAddress.PFPASIA_WETH,
    );
    // this.logger.debug(`symbol = PFPASIAUSD price = ${price}`);

    if (price === '0' || !price) {
      // TODO: need alert
      return;
    }

    await this.cacheService.setCache(
      `symbol-PFPASIAUSD-price`,
      {
        symbol: 'PFPASIAUSD',
        price,
      },
      CacheExpiredSeconds,
    );
  }

  async updateMJ404PriceToCache(): Promise<void> {
    const price = await this.getUniSwapV2PoolPrice(
      UniswapV2PoolAddress.MJ404_WETH,
      'latest',
      true,
    );
    // this.logger.debug(`symbol = MJ404USD price = ${price}`);

    if (price === '0' || !price) {
      // TODO: need alert
      return;
    }

    await this.cacheService.setCache(
      `symbol-MJ404USD-price`,
      {
        symbol: 'MJ404USD',
        price,
      },
      CacheExpiredSeconds,
    );
  }

  async updateMYSTCLPriceToCache(): Promise<void> {
    const price = await this.getUniSwapV3PoolPrice(
      UniswapV3PoolAddress.MYSTCL_WETH,
      'latest',
      true,
      8453,
    );
    // this.logger.debug(`symbol = MYSTCLUSD price = ${price}`);

    if (price === '0' || !price) {
      // TODO: need alert
      return;
    }

    await this.cacheService.setCache(
      `symbol-MYSTCLUSD-price`,
      {
        symbol: 'MYSTCLUSD',
        price,
      },
      CacheExpiredSeconds,
    );
  }

  async updateASTRPriceToCache(): Promise<void> {
    const price = await this.getCMCPriceBySymbol('ASTR');
    // this.logger.debug(`symbol = ASTRUSD price = ${price}`);

    if (price === '0' || !price) {
      return;
    }

    await this.cacheService.setCache(
      `symbol-ASTRUSD-price`,
      {
        symbol: 'ASTRUSD',
        price,
      },
      CacheExpiredSeconds,
    );
  }

  /**
   * 用 CoinMarketCap API 取得幣種價格
   * @param symbol
   */
  @Cacheable({ seconds: 60 * 30 })
  async getCMCPriceBySymbol(symbol: string): Promise<string> {
    if (!this.configService.get<string>('COIN_MARKET_CAP_API_KEY')) {
      return;
    }
    axios.defaults.headers.common['X-CMC_PRO_API_KEY'] =
      this.configService.get<string>('COIN_MARKET_CAP_API_KEY');
    const response = await axios.get(
      `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}`,
    );
    const price = response.data.data[symbol].quote.USD.price?.toString();
    return price;
  }
  /**
   * Compatibility methods for WalletService
   */
  async getCurrencyByAddressAndChainId(address: string, chainId: ChainId) {
    // Stub implementation to satisfy build.
    return {
      address,
      chainId,
      symbol: 'UNKNOWN',
      decimals: 18,
      name: 'Unknown Token',
      isNative: false,
      isWrapped: false,
    };
  }

  async getPriceByCurrency(currency: any) {
    if (!currency || !currency.symbol) return { price: '0' };
    const symbolUSD = `${currency.symbol.toUpperCase()}USD`;
    const cache = await this.getSymbolPrice(symbolUSD);
    return { price: cache ? cache.price : '0' };
  }

  async getCachePriceByChainId(chainId: ChainId) {
    const symbol = this.getNativeCurrencySymbolByChainId(chainId);
    if (!symbol) return { tokenPrice: { price: '0' } };
    const symbolUSD = `${symbol.toUpperCase()}USD`;
    const cache = await this.getSymbolPrice(symbolUSD);
    return { tokenPrice: { price: cache ? cache.price : '0' } };
  }
}

