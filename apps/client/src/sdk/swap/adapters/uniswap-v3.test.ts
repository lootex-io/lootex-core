import { expect, test } from 'vitest';

import { LOOT, WETH9 } from '../../token/constants';
import type { Token } from '../../token/types';

import { Client } from '../../client/index';
import { UniswapV3SwapAdapter } from './uniswap-v3';

const usdc: Token = {
  symbol: 'USDC',
  chainId: 8453,
  address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  decimals: 6,
};

test('get exact input trade', async () => {
  const client = new Client({});

  const weth = WETH9[8453];
  const loot = LOOT[8453];

  if (!weth || !usdc || !loot) {
    throw new Error('WETH or USDC or LOOT not found');
  }

  const adapter = new UniswapV3SwapAdapter({
    chainId: 8453,
    client,
  });

  const exactInputTrade = await adapter.getExactInputTrade(
    usdc,
    weth,
    100, // 1000 USDC
    '0x7D878A527e86321aECd80A493E584117A907A0AB',
    1
  );
  expect(exactInputTrade).toBeDefined();

  const exactOutputTrade = await adapter.getExactOutputTrade(
    usdc,
    weth,
    1, // 1 WETH
    '0x7D878A527e86321aECd80A493E584117A907A0AB',
    1
  );
  expect(exactOutputTrade).toBeDefined();
}, 10_000);
