import type { Token } from './types.js';

import { zeroAddress } from 'viem';

const native = (chainId: number, symbol: string): Token => ({
  chainId,
  address: zeroAddress,
  decimals: 18,
  symbol,
});

const weth9 = (
  chainId: number,
  address: `0x${string}`,
  symbol: string,
): Token => ({
  chainId,
  address,
  decimals: 18,
  symbol,
});

const loot = (chainId: number, address: `0x${string}`): Token => ({
  chainId,
  address,
  decimals: 18,
  symbol: 'LOOT',
});

export const NATIVE: Record<number, Token> = {
  1: native(1, 'ETH'),
  56: native(56, 'BNB'),
  137: native(137, 'POL'),
  5000: native(5000, 'MNT'),
  8453: native(8453, 'ETH'),
  42161: native(42161, 'ETH'),
  43114: native(43114, 'AVAX'),
  1946: native(1946, 'ETH'),
  1868: native(1868, 'ETH'),
};

export const WETH9: Record<number, Token> = {
  1: weth9(1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 'WETH'),
  56: weth9(56, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 'WBNB'),
  137: weth9(137, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', 'WPOL'),
  5000: weth9(5000, '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8', 'WMNT'),
  8453: weth9(8453, '0x4200000000000000000000000000000000000006', 'WETH'),
  42161: weth9(42161, '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 'WETH'),
  43114: weth9(43114, '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', 'WAVAX'),
  1946: weth9(1946, '0x4200000000000000000000000000000000000006', 'WETH'),
  1868: weth9(1868, '0x4200000000000000000000000000000000000006', 'WETH'),
};

export const LOOT: Record<number, Token> = {
  1: loot(1, '0x721A1B990699eE9D90b6327FaaD0A3E840aE8335'),
  56: loot(56, '0x14a9a94e555fdd54c21d7f7e328e61d7ebece54b'),
  5000: loot(5000, '0x94a42083948d86432246eAD625B30d49014A4BFF'),
  8453: loot(8453, '0x94a42083948d86432246eAD625B30d49014A4BFF'),
};

// A special token that is used to represent USD
export const USD = {
  decimals: 6,
  symbol: 'USD',
} as Token;
