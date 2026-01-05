import { describe, expect, it } from 'vitest';
import type { Token } from '../token/types';
import { CurrencyAmount } from './currency-amount';
import { Fraction } from './fraction';

describe('CurrencyAmount', () => {
  // Mock token for testing
  const mockToken: Token = {
    decimals: 18,
    // Add other required Token properties as needed
  } as Token;

  describe('Static Constructors', () => {
    it('fromFractionalAmount creates correct instance', () => {
      const amount = CurrencyAmount.fromFractionalAmount(mockToken, 100n, 1n);
      expect(amount.currency).toBe(mockToken);
      expect(amount.numerator).toBe(100n);
      expect(amount.denominator).toBe(1n);
    });

    it('fromFormattedAmount handles decimal strings correctly', () => {
      const amount = CurrencyAmount.fromFormattedAmount(mockToken, '1.5');
      // 1.5 * 10^18
      expect(amount.numerator).toBe(15000000000000000000n);
      expect(amount.denominator).toBe(10n);
    });

    it('fromRawAmount creates correct instance', () => {
      const amount = CurrencyAmount.fromRawAmount(
        mockToken,
        1500000000000000000n,
      );
      expect(amount.numerator).toBe(1500000000000000000n);
      expect(amount.denominator).toBe(1n);
    });
  });

  describe('Arithmetic Operations', () => {
    it('adds two CurrencyAmounts correctly', () => {
      const amount1 = CurrencyAmount.fromRawAmount(mockToken, 100n);
      const amount2 = CurrencyAmount.fromRawAmount(mockToken, 200n);
      const sum = amount1.add(amount2);
      expect(sum.numerator).toBe(300n);
    });

    it('subtracts two CurrencyAmounts correctly', () => {
      const amount1 = CurrencyAmount.fromRawAmount(mockToken, 200n);
      const amount2 = CurrencyAmount.fromRawAmount(mockToken, 100n);
      const difference = amount1.subtract(amount2);
      expect(difference.numerator).toBe(100n);
    });

    it('multiplies CurrencyAmount by Fraction correctly', () => {
      const amount = CurrencyAmount.fromRawAmount(mockToken, 100n);
      const fraction = new Fraction(2n);
      const product = amount.multiply(fraction);
      expect(product.numerator).toBe(200n);
    });
  });

  describe('Formatting', () => {
    it('formats to significant digits correctly', () => {
      const amount = CurrencyAmount.fromRawAmount(
        mockToken,
        1234567890000000000n,
      );
      expect(amount.toSignificant(3)).toBe('1.23');
    });

    it('formats with fixed decimal places correctly', () => {
      const amount = CurrencyAmount.fromRawAmount(
        mockToken,
        1234567890000000000n,
      );
      expect(amount.toFixed(2)).toBe('1.23');
    });

    it('respects custom decimal places in toFixed', () => {
      const amount = CurrencyAmount.fromRawAmount(
        mockToken,
        1234567890000000000n,
      );
      expect(amount.toFixed(4)).toBe('1.2346');
    });
  });

  describe('Edge Cases', () => {
    it('handles zero amount correctly', () => {
      const amount = CurrencyAmount.fromRawAmount(mockToken, 0n);
      expect(amount.toFixed()).toBe('0.000000000000000000');
    });

    it('handles very small amounts correctly', () => {
      const amount = CurrencyAmount.fromRawAmount(mockToken, 1n);
      expect(amount.toSignificant(1)).toBe('0.000000000000000001');
    });

    it('handles different token decimals correctly', () => {
      const token6Decimals: Token = {
        decimals: 6,
      } as Token;

      const amount = CurrencyAmount.fromFormattedAmount(token6Decimals, '1.23');
      expect(amount.numerator).toBe(123000000n);
      expect(amount.denominator).toBe(100n);
      expect(amount.toFixed()).toBe('1.230000');
    });
  });
});
