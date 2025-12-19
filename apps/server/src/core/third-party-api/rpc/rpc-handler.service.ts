import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigurationService } from '@/configuration';
import { CWLogService } from '@/core/third-party-api/cloudwatch-log/cw-log.service';
import { ethers } from 'ethers';
import { ethers as ethersV6 } from 'ethers-v6';
import { SupportedChains } from '@/microservice/event-poller/constants';
import { Chain, ChainMap } from '@/common/libs/libs.service';
import { ChainUtil } from '@/common/utils/chain.util';
import { withTimeout } from '@/common/utils/utils.pure';
import { RpcEnd } from '@/core/third-party-api/rpc/interfaces';
import { CacheService } from '@/common/cache';
import { ActiveChainConfig } from '@/common/utils/chain.config';

@Injectable()
export class RpcHandlerService {
  private publicRpcMaps = new Map<number, string[]>(); // RpcEnd.public: public rpc node 优先在前
  private mainRpcMaps = new Map<number, string[]>(); // RpcEnd.default: main rpc node 优先在前
  private eventPollerRpcMaps = new Map<number, string[]>(); // RpcEnd.event: event rpc node 优先
  private rpcIndexMap = new Map<string, number>(); // rpcEnd_chainId -> rpcUrl

  protected readonly logger = new Logger(RpcHandlerService.name);

  static RPC_COUNTER_KEYS = 'counter:rpc:keys';
  static RPC_COUNTER_START = 'counter:rpc:start_time';

  constructor(
    private readonly configService: ConfigurationService,
    private cwLogService: CWLogService,
    private cacheService: CacheService,
  ) {
    this.logger.debug('constructor');
    this.logger.debug('constructor');

    const chainId = ActiveChainConfig.id;
    const mainUrls = ActiveChainConfig.rpc.main;
    const eventPollerUrls = ActiveChainConfig.rpc.eventPoller;
    const publicUrls = ActiveChainConfig.rpc.backup;

    this.mainRpcMaps.set(chainId, [...mainUrls, ...publicUrls]);
    this.publicRpcMaps.set(chainId, [...publicUrls, ...mainUrls]);
    this.eventPollerRpcMaps.set(chainId, [...eventPollerUrls, ...publicUrls]);

    // Ensure Ethereum Mainnet (Chain ID 1) is available for CurrencyService price feeds
    if (!this.mainRpcMaps.has(1)) {
      const ethRpc = ['https://rpc.ankr.com/eth', 'https://eth.llamarpc.com'];
      this.mainRpcMaps.set(1, ethRpc);
      this.publicRpcMaps.set(1, ethRpc);
      this.eventPollerRpcMaps.set(1, ethRpc);
    }
  }

  getRpcUrl(chainId: number, rpcEnd = RpcEnd.default) {
    chainId = +chainId;
    const rpcIndex = this._getRpcIndex(chainId, rpcEnd);

    let rpcUrls = [];
    if (rpcEnd === RpcEnd.public) {
      rpcUrls = this.publicRpcMaps.get(chainId);
    } else if (rpcEnd === RpcEnd.event) {
      rpcUrls = this.eventPollerRpcMaps.get(chainId);
    } else {
      rpcUrls = this.mainRpcMaps.get(chainId);
    }
    const rpcUrl =
      rpcUrls[((rpcIndex % rpcUrls.length) + rpcUrls.length) % rpcUrls.length];
    // console.log(`getRpcUrl ${rpcEnd} ${chainId} ${rpcUrl} ${rpcIndex}`);
    return rpcUrl;
  }

  resetRpcIndex(chainId: number, rpcEnd = RpcEnd.default) {
    this._setRpcIndex(chainId, 0, rpcEnd);
  }

  createStaticJsonRpcProvider(chainId: number, rpcEnd = RpcEnd.default) {
    const rpcUrl = this.getRpcUrl(chainId, rpcEnd);
    // this.logger.debug(`createStaticJsonRpcProvider ${rpcEnd} ${rpcUrl}`);
    const provider = new ethers.providers.StaticJsonRpcProvider(
      rpcUrl,
      +chainId,
    );
    return provider;
  }

  createStaticJsonRpcProviderV6(chainId: number, rpcEnd = RpcEnd.default) {
    const rpcUrl = this.getRpcUrl(chainId, rpcEnd);
    // this.logger.debug(`createStaticJsonRpcProvider ${rpcEnd} ${rpcUrl}`);
    const provider = new ethersV6.JsonRpcProvider(rpcUrl);

    return provider;
  }

  switchRpcIndex(chainId: number, rpcEnd = RpcEnd.default) {
    this.logger.debug(`switchRpcIndex ${chainId}`);
    chainId = +chainId;
    const rpcIndex = this._getRpcIndex(chainId, rpcEnd);
    this._setRpcIndex(chainId, rpcIndex + 1, rpcEnd);
    this.logger.log(
      `switchRpcIndex chainId ${chainId} index ${rpcEnd} ${rpcIndex + 1
      } : ${this.getRpcUrl(chainId, rpcEnd)}`,
    );
  }

  _getRpcIndex(chainId: number, rpcEnd: RpcEnd) {
    return this.rpcIndexMap.get(`${rpcEnd}_${chainId}`) ?? 0;
  }

  _setRpcIndex(chainId: number, value: number, rpcEnd: RpcEnd) {
    return this.rpcIndexMap.set(`${rpcEnd}_${chainId}`, value);
  }

  async incrCounter(className: string, method: string, chainId: number) {
    const seconds = 2592000; // 30天
    const rpcCounter = `counter:rpc:${className}:${method}`;
    this.cacheService
      .getCache<string[]>(RpcHandlerService.RPC_COUNTER_KEYS)
      .then((counters) => {
        if (counters) {
          if (counters.indexOf(rpcCounter) === -1) {
            counters.push(rpcCounter);
            this.cacheService.setCache(
              RpcHandlerService.RPC_COUNTER_KEYS,
              counters,
              seconds,
            );
          }
        } else {
          counters = [rpcCounter];
          this.cacheService.setCache(
            RpcHandlerService.RPC_COUNTER_KEYS,
            counters,
            seconds,
          );
        }
      });
    const counterStr = await this.cacheService.getCache<string>(rpcCounter);
    const keyStr = `${ChainUtil.chainIdToChain(chainId)}`;
    let counterObj = {};
    if (!counterStr) {
      counterObj = {};
      counterObj[keyStr] = 1;
    } else {
      try {
        counterObj = JSON.parse(counterStr);
      } catch (e) {
        counterObj = {};
      }
      if (!counterObj[keyStr]) {
        counterObj[keyStr] = 0;
      }
      counterObj[keyStr] = counterObj[keyStr] + 1;
    }

    await this.cacheService.setCache<string>(
      rpcCounter,
      JSON.stringify(counterObj),
      seconds,
    );
  }

  async cleanCounter() {
    const counterKeys = await this.cacheService.getCache<string[]>(
      RpcHandlerService.RPC_COUNTER_KEYS,
    );
    if (counterKeys) {
      for (const counterKey of counterKeys) {
        await this.cacheService.setCache<number>(counterKey, 0);
      }
      await this.cacheService.setCache(RpcHandlerService.RPC_COUNTER_KEYS, []);
    }
    await this.cacheService.setCache(
      RpcHandlerService.RPC_COUNTER_START,
      new Date().getTime(),
      2592000,
    );
  }
}

// 注意使用這個 decorator 的 class 需要有 rpcHandlerService 這個 property，然後不可用 try catch 包住
export function RpcCall(options?: RpcCallOptions) {
  options = {
    maxRetry: 6, // 6
    timeout: 10, // 10
    swapStep: 2, // 2
    undefinedRetry: true,
    rpcEnd: RpcEnd.default,
    chainIdFn: (args) => args[0], // 告訴這個decorator如何取得chainId（原本function的chainId是第幾個傳入參數，預設是0）
    ...options,
  };
  const rpcHandlerService = Inject(RpcHandlerService);

  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    rpcHandlerService(target, 'rpcHandlerService');
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const rpcHandlerService: RpcHandlerService = this.rpcHandlerService;
      const chainId = options.chainIdFn(args);
      // console.log(`RpcCall ${propertyKey} chainId ${chainId}`);
      rpcHandlerService.incrCounter(
        target.constructor.name,
        propertyKey,
        chainId,
      );
      const rpcEnd = this.rpcEnd ?? options.rpcEnd;
      if (rpcEnd === RpcEnd.public) {
        rpcHandlerService.resetRpcIndex(chainId, rpcEnd);
      }
      return await retryAsync.apply(this, [
        {
          rpcHandlerService: rpcHandlerService,
          rpcEnd: rpcEnd,
          maxRetry: options.maxRetry,
          timeout: options.timeout,
          swapStep: options.swapStep,
          undefinedRetry: options.undefinedRetry,
          chainId: chainId,
          fnName: propertyKey,
          fn: originalMethod,
          args: args,
        },
      ]);
    };
    return descriptor;
  };

  async function retryAsync(options: {
    rpcHandlerService: RpcHandlerService;
    rpcEnd: RpcEnd;
    maxRetry: number;
    swapStep: number;
    undefinedRetry: boolean;
    timeout: number;
    chainId: number;
    fnName: string;
    fn: () => any;
    args: any[];
  }) {
    let retry = options.maxRetry;
    while (retry > 0) {
      // console.log(`rpcCall retry ${retry}`);
      try {
        // 每次call timeout 为10s
        const p = options.fn.apply(this, options.args);
        const res = await withTimeout(p, options.timeout * 1000);
        if (options.undefinedRetry && !res) {
          throw new Error('rpc call return undefined.');
        }
        return res;
      } catch (e) {
        retry--;
        if (retry % options.swapStep === 0 && options.chainId != null) {
          // 根据swapStep更换rpc
          options.rpcHandlerService.switchRpcIndex(
            options.chainId,
            options.rpcEnd,
          );
        }
      }
    }
    return undefined;
  }
}

export interface RpcCallOptions {
  maxRetry?: number;
  undefinedRetry?: boolean; // 返回 undefined 是否retry, 默认true
  timeout?: number; // 单位秒
  swapStep?: number; // retry 切换 rpc 间隔。默认2，代表retry 2次切换rpc节点
  // 获取chainId
  chainIdFn?: (args: any[]) => number;
  rpcEnd?: RpcEnd;
}
