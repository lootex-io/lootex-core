import { http, type PublicClient, createPublicClient } from 'viem';
import { supportedChains } from '../chains/constants.js';

export type ClientConfig = {
  environment: 'development' | 'production' | 'staging';
  apiKey?: string;
  getRpcUrl?: (chainId: number) => string;
  customHeaders?: Record<string, string>;
  baseUrl?: string;
};

export const createLootexClient = (config: ClientConfig) => {
  return new Client(config);
};

export class Client {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly getRpcUrl?: (chainId: number) => string;
  readonly isDev?: boolean;
  readonly customHeaders?: Record<string, string>;
  constructor(config: ClientConfig) {
    console.log('local sdk config', config);
    this.baseUrl =
      config.baseUrl ??
      (config.environment === 'production'
        ? 'https://v3-api.lootex.io/api'
        : (config.environment === 'staging' &&
            'https://staging-api.lootex.dev/api') ||
          'https://dex-v3-api-aws.lootex.dev/api');
    this.apiKey = config.apiKey ?? '';
    this.customHeaders = config.customHeaders;
    this.getRpcUrl = config.getRpcUrl;
    this.isDev = config.environment === 'development';
  }

  public getPublicClient({ chainId }: { chainId: number }): PublicClient {
    const chain = supportedChains.find((chain) => chain.id === chainId);

    if (!chain) {
      throw new Error(`Chain with id ${chainId} not found`);
    }

    return createPublicClient({
      chain,
      transport: http(this.getRpcUrl?.(chainId)),
      batch: {
        multicall: true,
      },
    });
  }
}
