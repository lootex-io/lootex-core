import { parseUnits, zeroAddress } from 'viem';
import { describe, expect, it } from 'vitest';
import type { LootexOrder } from '../../../order/types.js';
import { addTipsToOrder, tipConfigToConsiderationItem } from './tips.js';

const partialOrder = {
  chainId: 1,
  seaportOrder: {
    parameters: {
      offer: [
        {
          itemType: 2,
          token: '0x7D878A527e86321aECd80A493E584117A907A0AB',
          identifierOrCriteria: 1,
          startAmount: 1,
          endAmount: 1,
        },
      ],
      consideration: [
        {
          itemType: 0,
          token: zeroAddress,
          identifierOrCriteria: '0',
          startAmount: parseUnits('1', 18).toString(),
          endAmount: parseUnits('1', 18).toString(),
          recipient: '0x7D878A527e86321aECd80A493E584117A907A0AB',
        },
      ],
    },
  },
};

describe('tipConfigToConsiderationItem', () => {
  it('should return a ConsiderationItem', () => {
    expect(
      tipConfigToConsiderationItem(
        {
          recipient: '0xbF6692795A07684147838fC54A2764aa884C440c',
          percentage: 2.5,
        },
        partialOrder as unknown as LootexOrder,
      ),
    ).toEqual({
      itemType: 0,
      token: zeroAddress,
      identifierOrCriteria: '0',
      // should be 2.5% of the price
      startAmount: parseUnits('0.025', 18).toString(),
      endAmount: parseUnits('0.025', 18).toString(),
      recipient: '0xbF6692795A07684147838fC54A2764aa884C440c',
    });
  });
});

describe('addTipsToOrder', () => {
  it('should add tips to the order', () => {
    const tipItem = {
      itemType: 0,
      token: zeroAddress,
      identifierOrCriteria: '0',
      startAmount: parseUnits('0.01', 18).toString(),
      endAmount: parseUnits('0.01', 18).toString(),
      recipient: '0xbF6692795A07684147838fC54A2764aa884C440c',
    } as const;

    expect(
      addTipsToOrder(partialOrder as unknown as LootexOrder, [tipItem])
        .seaportOrder.parameters.consideration,
    ).toHaveLength(2);
  });

  it('should not do anything if no tips are provided', () => {
    expect(addTipsToOrder(partialOrder as unknown as LootexOrder, [])).toEqual(
      partialOrder,
    );
  });
});
