import type { Client } from '../client/index';
import { UniswapV3SwapAdapter } from './adapters/index';
import type { IBaseSwapAdapter } from './types';

export const createSwapClient = ({
  chainId,
  client,
}: {
  chainId: number;
  client: Client;
}): IBaseSwapAdapter => {
  if ([1, 56, 137, 5000, 42161, 43114, 8453, 1946, 1868].includes(chainId)) {
    return new UniswapV3SwapAdapter({
      chainId,
      client,
    });
  }

  throw new Error('Unsupported chainId');
};
