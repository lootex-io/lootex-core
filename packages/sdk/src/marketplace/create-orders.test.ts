import { describe, expect, it } from 'vitest';
import { createLootexClient } from '../client/index.js';
import { createOrders } from './create-orders.js';

const lootex = createLootexClient({});

describe('create-orders', () => {
  it('should create an order', async () => {
    const res = await createOrders({
      client: lootex,
      chainId: 1868,
      category: 'LISTING',
      accountAddress: '0xbF6692795A07684147838fC54A2764aa884C440c',
      data: [
        {
          tokenAddress: '0xf46169fa38c41b409b6d974d0e49c7417ea4ea97',
          tokenId: '1',
          unitPrice: '1000000000000000000', // 1 ETH
        },
      ],
    });

    // test if the response is serializable
    expect(JSON.stringify(res, null, 2)).toBeDefined();

    expect(res.steps[0].id).toBe('approve-tokens');

    expect(res.steps[1].id).toBe('create-orders');
    expect(res.steps[1].items.length).toBe(2);
    expect(res.steps[1].items[0].type).toBe('signTypedData');
    expect(res.steps[1].items[1].type).toBe('post');
  });
});
