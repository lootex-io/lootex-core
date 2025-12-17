import { parseUnits } from 'viem';
import { describe, expect, it } from 'vitest';
import type { Token } from '../token/types.js';
import { CurrencyAmount } from './currency-amount.js';
import { Price, UsdPrice } from './price.js';
describe('Price', () => {
  const ETH = {
    symbol: 'ETH',
    decimals: 18,
  } as Token;

  const USDT = {
    symbol: 'USDT',
    decimals: 6,
  } as Token;

  it('constructs a price with correct properties', () => {
    const price = new Price(
      ETH,
      USDT,
      parseUnits('1', ETH.decimals),
      parseUnits('3000', USDT.decimals),
    );

    expect(price.baseCurrency).toBe(ETH);
    expect(price.quoteCurrency).toBe(USDT);
    expect(price.toFixed(0)).toBe('3000');
  });

  it('constructs a price from currency amounts', () => {
    const price = Price.fromCurrencyAmounts(
      CurrencyAmount.fromFormattedAmount(ETH, 1),
      CurrencyAmount.fromFormattedAmount(USDT, 3000),
    );

    expect(price.baseCurrency).toBe(ETH);
    expect(price.quoteCurrency).toBe(USDT);
    expect(price.toFixed(0)).toBe('3000');
  });

  it('quotes correct amounts', () => {
    const price = new Price(
      ETH,
      USDT,
      parseUnits('1', ETH.decimals),
      parseUnits('3000', USDT.decimals),
    );

    // Quote 1 ETH
    const oneEthQuote = price.quote();
    expect(oneEthQuote.currency).toBe(USDT);
    expect(oneEthQuote.toFixed(0)).toBe('3000');

    // Quote 2 ETH
    const twoEth = CurrencyAmount.fromFormattedAmount(ETH, 2);
    const twoEthQuote = price.quote(twoEth);
    expect(twoEthQuote.toFixed(0)).toBe('6000');
  });

  it('handles decimal precision correctly', () => {
    const price = new Price(
      ETH,
      USDT,
      parseUnits('1', ETH.decimals),
      parseUnits('3000', USDT.decimals),
    );

    expect(price.toFixed(2)).toBe('3000.00');
    expect(price.toSignificant(4)).toBe('3000');
    expect(price.toSignificant(2)).toBe('3000');
  });

  it('handles different decimal places between tokens', () => {
    const WBTC = {
      symbol: 'WBTC',
      decimals: 8,
    } as Token;

    const price = new Price(
      WBTC,
      USDT,
      parseUnits('1', WBTC.decimals),
      parseUnits('50000', USDT.decimals),
    );
    expect(price.toFixed(0)).toBe('50000');

    const oneWbtc = price.quote();
    expect(oneWbtc.toFixed(0)).toBe('50000');
  });
});

describe('UsdPrice', () => {
  const ETH = {
    symbol: 'ETH',
    decimals: 18,
  } as Token;

  it('constructs USD price from number', () => {
    const price = new UsdPrice(3000, ETH);
    expect(price.toFixed(0)).toBe('3000');

    const quote = price.quote();
    expect(quote.toFixed(0)).toBe('3000');
  });

  it('constructs USD price from string', () => {
    const price = new UsdPrice('3000.50', ETH);
    expect(price.toFixed(2)).toBe('3000.50');

    const quote = price.quote();
    expect(quote.toFixed(2)).toBe('3000.50');
  });

  it('handles fractional USD prices', () => {
    const price = new UsdPrice('0.5', ETH);
    expect(price.toFixed(2)).toBe('0.50');

    const quote = price.quote();
    expect(quote.toFixed(2)).toBe('0.50');
  });
});
