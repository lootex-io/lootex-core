import { describe, expect, it } from 'vitest';

import { http, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { WETH9 } from '../token/constants.js';
import { CurrencyAmount } from '../utils/currency-amount.js';

import { Client } from '../client/index.js';
import { createAggregator } from './aggregator.js';
import type { CreateOrderAction } from './types.js';

const lootex = new Client({});

const testAccountAddress = '0xbF6692795A07684147838fC54A2764aa884C440c';
const testPrivateKey =
  '0xaf0c212028bfa11730cd07b0a3cffc569cd2ec3b36703c367001cde03a1f58b5';

const account = privateKeyToAccount(testPrivateKey);

const walletClient = createWalletClient({
  account,
  transport: http(),
  chain: polygon,
});

describe('Aggregator', async () => {
  it('should create an aggregator', () => {
    const aggregator = createAggregator({
      client: lootex,
    });
    expect(aggregator).toBeDefined();
  });
  it('should create orders', async () => {
    const aggregator = createAggregator({
      client: lootex,
    });
    const execution = await aggregator.createOrders({
      chainId: 137,
      walletClient,
      accountAddress: testAccountAddress,
      orders: [
        {
          tokenAddress: '0xcc4a710fde0c2e286a8b44cf0463e9278b0e3708',
          tokenId: '6',
          tokenType: 'ERC721',
          unitPrice: new CurrencyAmount(WETH9[137], 1000000000000000000n),
          quantity: 1,
          duration: new Date(Date.now() + 1000 * 60 * 60 * 24),
          orderType: 'LISTING',
          fees: [],
        },
      ],
    });
    expect(execution).toBeDefined();
    expect(execution.actions.length).toBe(1);
    const createOrderAction = execution.actions[0] as CreateOrderAction;
    expect(createOrderAction.type).toBe('create');
    expect(
      (await createOrderAction.createOrders({ createOrdersOnOrderbook: false }))
        .seaportOrders
    ).toHaveLength(1);
  });

  it('should create bulk orders', async () => {
    const aggregator = createAggregator({
      client: lootex,
    });
    const execution = await aggregator.createOrders({
      chainId: 137,
      walletClient,
      accountAddress: testAccountAddress,
      orders: [
        {
          tokenAddress: '0xcc4a710fde0c2e286a8b44cf0463e9278b0e3708',
          tokenId: '6',
          tokenType: 'ERC721',
          unitPrice: new CurrencyAmount(WETH9[137], 1000000000000000000n),
          quantity: 1,
          duration: new Date(Date.now() + 1000 * 60 * 60 * 24),
          orderType: 'LISTING',
          fees: [],
        },
        {
          tokenAddress: '0xe5fdee9a794e219589744798659386f30cca8e39',
          tokenId: '23',
          tokenType: 'ERC721',
          unitPrice: new CurrencyAmount(WETH9[137], 1000000000000000000n),
          quantity: 1,
          duration: new Date(Date.now() + 1000 * 60 * 60 * 24),
          orderType: 'LISTING',
          fees: [],
        },
      ],
    });
    expect(execution).toBeDefined();
    expect(execution.actions.length).toBe(2);
  });
});
