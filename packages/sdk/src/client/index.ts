import { http, type PublicClient, createPublicClient } from 'viem';
import { supportedChains } from '../chains/constants.js';

export type ClientConfig = {
  getRpcUrl?: (chainId: number) => string;
  customHeaders?: Record<string, string>;
  baseUrl?: string;
};

export const createLootexClient = (config: ClientConfig) => {
  return new Client(config);
};

export class Client {
  readonly baseUrl: string;
  readonly getRpcUrl?: (chainId: number) => string;
  readonly customHeaders?: Record<string, string>;
  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:2999/api';
    this.customHeaders = config.customHeaders;
    this.getRpcUrl = config.getRpcUrl;
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
