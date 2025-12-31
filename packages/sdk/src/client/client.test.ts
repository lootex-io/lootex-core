import { expect, test } from 'vitest';

import { erc20Abi } from 'viem';

import { Client } from './index.js';

test('create client', async () => {
  const lootex = new Client({});

  const publicClient = lootex.getPublicClient({ chainId: 137 });
  const data = await publicClient.readContract({
    address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    abi: erc20Abi,
    functionName: 'symbol',
  });

  expect(data).toBe('USDT');
});
