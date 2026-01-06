import { describe, expect, it } from 'vitest';
import { Fraction } from './fraction';

describe('Fraction', () => {
  describe('constructor', () => {
    it('creates fraction from numbers', () => {
      const fraction = new Fraction(1, 2);
      expect(fraction.numerator).toBe(1n);
      expect(fraction.denominator).toBe(2n);
    });

    it('creates fraction from bigints', () => {
      const fraction = new Fraction(1n, 2n);
      expect(fraction.numerator).toBe(1n);
      expect(fraction.denominator).toBe(2n);
    });

    it('creates fraction from strings', () => {
      const fraction = new Fraction('1', '2');
      expect(fraction.numerator).toBe(1n);
      expect(fraction.denominator).toBe(2n);
    });

    it('defaults denominator to 1 when not provided', () => {
      const fraction = new Fraction(5);
      expect(fraction.numerator).toBe(5n);
      expect(fraction.denominator).toBe(1n);
    });
  });

  describe('fromDecimal', () => {
    it('converts simple decimal string', () => {
      const fraction = Fraction.fromDecimal('1.5');
      expect(fraction.numerator).toBe(15n);
      expect(fraction.denominator).toBe(10n);
    });

    it('converts decimal number', () => {
      const fraction = Fraction.fromDecimal(1.5);
      expect(fraction.numerator).toBe(15n);
      expect(fraction.denominator).toBe(10n);
    });

    it('handles scientific notation', () => {
      const fraction = Fraction.fromDecimal('1.5e2');
      expect(fraction.numerator).toBe(1500n);
      expect(fraction.denominator).toBe(10n);
    });

    it('handles negative scientific notation', () => {
      const fraction = Fraction.fromDecimal('1.5e-2');
      expect(fraction.numerator).toBe(15n);
      expect(fraction.denominator).toBe(1000n);
    });
  });

  describe('arithmetic operations', () => {
    it('adds fractions', () => {
      const a = new Fraction(1, 2);
      const b = new Fraction(1, 3);
      const result = a.add(b);
      expect(result.numerator).toBe(5n);
      expect(result.denominator).toBe(6n);
    });

    it('subtracts fractions', () => {
      const a = new Fraction(1, 2);
      const b = new Fraction(1, 3);
      const result = a.subtract(b);
      expect(result.numerator).toBe(1n);
      expect(result.denominator).toBe(6n);
    });

    it('multiplies fractions', () => {
      const a = new Fraction(1, 2);
      const b = new Fraction(2, 3);
      const result = a.multiply(b);
      expect(result.numerator).toBe(2n);
      expect(result.denominator).toBe(6n);
    });

    it('divides fractions', () => {
      const a = new Fraction(1, 2);
      const b = new Fraction(2, 3);
      const result = a.divide(b);
      expect(result.numerator).toBe(3n);
      expect(result.denominator).toBe(4n);
    });
  });

  describe('comparison operations', () => {
    it('compares less than', () => {
      const a = new Fraction(1, 3);
      const b = new Fraction(1, 2);
      expect(a.lessThan(b)).toBe(true);
      expect(b.lessThan(a)).toBe(false);
    });

    it('compares greater than', () => {
      const a = new Fraction(1, 2);
      const b = new Fraction(1, 3);
      expect(a.greaterThan(b)).toBe(true);
      expect(b.greaterThan(a)).toBe(false);
    });

    it('compares equal to', () => {
      const a = new Fraction(1, 2);
      const b = new Fraction(2, 4);
      expect(a.equalTo(b)).toBe(true);
    });
  });

  describe('formatting', () => {
    it('converts to fixed decimal places', () => {
      const fraction = new Fraction(1, 2);
      expect(fraction.toFixed(2)).toBe('0.50');
      expect(fraction.toFixed(3)).toBe('0.500');
    });

    it('handles rounding in toFixed', () => {
      const fraction = new Fraction(1, 3);
      expect(fraction.toFixed(2, 'ROUND_DOWN')).toBe('0.33');
      expect(fraction.toFixed(2, 'ROUND_HALF_UP')).toBe('0.33');
      expect(fraction.toFixed(2, 'ROUND_UP')).toBe('0.34');
    });

    it('converts to significant digits', () => {
      const fraction = new Fraction(12345, 100);
      expect(fraction.toSignificant(3)).toBe('123');
      expect(fraction.toSignificant(4)).toBe('123.5');
      expect(fraction.toSignificant(5)).toBe('123.45');
    });

    it('handles very small fractions', () => {
      const fraction = new Fraction(1, 1000000000000000000n);
      expect(fraction.toSignificant(1)).toBe('0.000000000000000001');
    });

    it('handles trailing zeros', () => {
      const fraction = new Fraction(1, 1000000n);
      expect(fraction.toSignificant(2)).toBe('0.000001');
    });
  });

  describe('utility methods', () => {
    it('inverts fraction', () => {
      const fraction = new Fraction(2, 3);
      const inverted = fraction.invert();
      expect(inverted.numerator).toBe(3n);
      expect(inverted.denominator).toBe(2n);
    });

    it('calculates quotient', () => {
      const fraction = new Fraction(5, 2);
      expect(fraction.quotient()).toBe(2n);
    });
  });

  describe('type guards and conversion', () => {
    it('checks if value is Fraction', () => {
      const fraction = new Fraction(1, 2);
      expect(Fraction.isFraction(fraction)).toBe(true);
      expect(Fraction.isFraction({})).toBe(false);
      expect(Fraction.isFraction(null)).toBe(false);
    });

    it('converts various types to Fraction', () => {
      expect(Fraction.toFraction(new Fraction(1, 2))).toBeInstanceOf(Fraction);
      expect(Fraction.toFraction('1.5')).toBeInstanceOf(Fraction);
      expect(Fraction.toFraction(1.5)).toBeInstanceOf(Fraction);
      expect(Fraction.toFraction(2n)).toBeInstanceOf(Fraction);
    });

    it('throws error for invalid conversion', () => {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      expect(() => Fraction.toFraction({} as any)).toThrow(
        'Could not convert to Fraction',
      );
    });
  });
});
