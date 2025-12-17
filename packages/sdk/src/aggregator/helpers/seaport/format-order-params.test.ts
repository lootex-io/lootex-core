import { parseUnits } from 'viem';
import { describe, expect, it } from 'vitest';
import { CurrencyAmount } from '../../../utils/currency-amount.js';

import { formatOrderParams } from './format-order-params.js';

const accountAddress = '0x7D878A527e86321aECd80A493E584117A907A0AB';
const feeRecipient = '0xbF6692795A07684147838fC54A2764aa884C440c';
const erc721Address = '0x7210000000000000000000000000000000000000';
const erc20Address = '0x2000000000000000000000000000000000000000';
const nativeAddress = '0x0000000000000000000000000000000000000000';

describe('formatOrderParams', () => {
  it('listing', () => {
    const unitPriceAmount = parseUnits('1', 18);
    const params = formatOrderParams({
      tokenAddress: erc721Address,
      tokenId: '1',
      tokenType: 'ERC721',
      unitPrice: new CurrencyAmount(
        {
          symbol: 'ETH',
          decimals: 18,
          address: nativeAddress,
          chainId: 1,
        },
        unitPriceAmount,
      ),
      quantity: 1,
      duration: new Date(),
      orderType: 'LISTING',
      fees: [
        {
          percentage: 1,
          recipient: feeRecipient,
        },
      ],
      accountAddress: accountAddress,
    });

    expect(params.offer).toHaveLength(1);
    expect(params.consideration).toHaveLength(2);
    expect(params.offer[0].token).toBe(erc721Address);
    expect(params.consideration[0].token).toBe(nativeAddress);
    expect(params.consideration[0].recipient).toBe(accountAddress);
    expect(params.consideration[1].token).toBe(nativeAddress);
    expect(params.consideration[1].recipient).toBe(feeRecipient);
  });

  it('offer', () => {
    const unitPriceAmount = parseUnits('1', 18);
    const params = formatOrderParams({
      tokenAddress: erc721Address,
      tokenId: '1',
      tokenType: 'ERC721',
      unitPrice: new CurrencyAmount(
        {
          symbol: 'WETH',
          decimals: 18,
          address: erc20Address,
          chainId: 1,
        },
        unitPriceAmount,
      ),
      quantity: 1,
      duration: new Date(),
      orderType: 'OFFER',
      fees: [
        {
          percentage: 1,
          recipient: feeRecipient,
        },
      ],
      accountAddress: accountAddress,
    });

    expect(params.offer).toHaveLength(1);
    expect(params.consideration).toHaveLength(2);
    expect(params.offer[0].token).toBe(erc20Address);
    expect(params.consideration[0].token).toBe(erc721Address);
    expect(params.consideration[0].recipient).toBe(accountAddress);
    expect(params.consideration[1].token).toBe(erc20Address);
    expect(params.consideration[1].recipient).toBe(feeRecipient);
  });
});
