import type { Client } from '../client/index';
import type { Token } from '../token/types';
import type { CurrencyAmount } from '../utils/currency-amount';
import type { Price } from '../utils/price';

export interface IBaseSwapAdapter {
  readonly chainId: number;
  readonly client: Client;
  readonly swapAddress: `0x${string}`;

  getExactInputTrade(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string | number,
    accountAddress: `0x${string}`,
    slippage: number,
  ): Promise<SwapTrade>;

  getExactOutputTrade(
    tokenIn: Token,
    tokenOut: Token,
    amountOut: string | number,
    accountAddress: `0x${string}`,
    slippage: number,
  ): Promise<SwapTrade>;
}

export type SwapTrade = {
  currencyAmountIn: CurrencyAmount;
  currencyAmountOut: CurrencyAmount;
  executionPrice: Price;
  getActions: () => Promise<SwapAction[]>;
};

export type SwapAction = {
  type: 'swap' | 'approve';
  buildTransaction: () => Promise<{
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }>;
};

export type Pool = {
  token0: `0x${string}`;
  token1: `0x${string}`;
  address?: `0x${string}`;
  fee: number;
};
