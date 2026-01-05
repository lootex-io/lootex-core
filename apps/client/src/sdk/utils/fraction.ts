export type BigintIsh = bigint | string | number;
export type Rounding = 'ROUND_DOWN' | 'ROUND_HALF_UP' | 'ROUND_UP';

export class Fraction {
  readonly numerator: bigint;
  readonly denominator: bigint;

  constructor(numerator: BigintIsh, denominator: BigintIsh = 1n) {
    this.numerator = BigInt(numerator);
    this.denominator = BigInt(denominator);
  }

  static fromDecimal(decimalStr: string | number): Fraction {
    const str = decimalStr.toString();
    // Handle scientific notation
    if (str.includes('e')) {
      const [mantissa, exponentStr] = str.split('e');
      const exponent = Number.parseInt(exponentStr);
      const base = Fraction.fromDecimal(mantissa);
      const scale = 10n ** BigInt(Math.abs(exponent));

      return exponent >= 0
        ? new Fraction(base.numerator * scale, base.denominator)
        : new Fraction(base.numerator, base.denominator * scale);
    }

    // Handle regular decimal numbers
    const [integerPart, decimalPart = ''] = str.split('.');
    const denominator = 10n ** BigInt(decimalPart.length);
    const numerator = BigInt(integerPart.replace('.', '') + decimalPart);

    return new Fraction(numerator.toString(), denominator.toString());
  }

  static isFraction(value: unknown): value is Fraction {
    return (
      typeof value === 'object' &&
      value !== null &&
      'numerator' in value &&
      'denominator' in value &&
      typeof value.numerator === 'bigint' &&
      typeof value.denominator === 'bigint'
    );
  }

  static toFraction(fractionish: Fraction | BigintIsh): Fraction {
    if (Fraction.isFraction(fractionish)) {
      return new Fraction(fractionish.numerator, fractionish.denominator);
    }

    if (typeof fractionish === 'string' || typeof fractionish === 'number') {
      return Fraction.fromDecimal(fractionish);
    }

    if (typeof fractionish === 'bigint') {
      return new Fraction(fractionish, 1n);
    }

    throw new Error('Could not convert to Fraction');
  }

  add(other: Fraction | BigintIsh): Fraction {
    const otherFraction = Fraction.toFraction(other);
    if (this.denominator === otherFraction.denominator) {
      return new Fraction(
        this.numerator + otherFraction.numerator,
        this.denominator,
      );
    }

    return new Fraction(
      this.numerator * otherFraction.denominator +
        otherFraction.numerator * this.denominator,
      this.denominator * otherFraction.denominator,
    );
  }

  subtract(other: Fraction | BigintIsh): Fraction {
    const otherFraction = Fraction.toFraction(other);

    if (this.denominator === otherFraction.denominator) {
      return new Fraction(
        this.numerator - otherFraction.numerator,
        this.denominator,
      );
    }

    return new Fraction(
      this.numerator * otherFraction.denominator -
        otherFraction.numerator * this.denominator,
      this.denominator * otherFraction.denominator,
    );
  }

  multiply(other: Fraction | BigintIsh): Fraction {
    const otherFraction = Fraction.toFraction(other);

    return new Fraction(
      this.numerator * otherFraction.numerator,
      this.denominator * otherFraction.denominator,
    );
  }

  divide(other: Fraction | BigintIsh): Fraction {
    const otherFraction = Fraction.toFraction(other);

    return new Fraction(
      this.numerator * otherFraction.denominator,
      this.denominator * otherFraction.numerator,
    );
  }

  invert(): Fraction {
    return new Fraction(this.denominator, this.numerator);
  }

  quotient(): bigint {
    return this.numerator / this.denominator;
  }

  lessThan(other: Fraction | BigintIsh): boolean {
    const otherFraction = Fraction.toFraction(other);

    return (
      this.numerator * otherFraction.denominator <
      this.denominator * otherFraction.numerator
    );
  }

  greaterThan(other: Fraction | BigintIsh): boolean {
    const otherFraction = Fraction.toFraction(other);

    return (
      this.numerator * otherFraction.denominator >
      this.denominator * otherFraction.numerator
    );
  }

  equalTo(other: Fraction | BigintIsh): boolean {
    const otherFraction = Fraction.toFraction(other);

    return (
      this.numerator * otherFraction.denominator ===
      this.denominator * otherFraction.numerator
    );
  }

  toSignificant(
    significantDigits = 6,
    rounding: Rounding = 'ROUND_HALF_UP',
  ): string {
    const quotient = this.quotient();
    const quotientStr = quotient.toString();

    // If quotient is 0, we need to handle decimal portion
    if (quotient === 0n) {
      // Use a larger scalar to maintain precision
      const scalar = 10n ** 40n;
      const expanded = (this.numerator * scalar) / this.denominator;
      const expandedStr = expanded.toString().padStart(40, '0');

      // Find first non-zero digit
      let firstNonZeroIndex = 0;
      while (
        firstNonZeroIndex < expandedStr.length &&
        expandedStr[firstNonZeroIndex] === '0'
      ) {
        firstNonZeroIndex++;
      }

      if (firstNonZeroIndex === expandedStr.length) {
        return '0';
      }

      // Calculate leading zeros after decimal point
      const leadingZeros = firstNonZeroIndex;

      // Get the significant digits
      const significantPart = expandedStr.slice(
        firstNonZeroIndex,
        firstNonZeroIndex + significantDigits,
      );

      // Remove trailing zeros
      const trimmedSignificantPart = significantPart.replace(/0+$/, '');

      return `0.${'0'.repeat(leadingZeros)}${trimmedSignificantPart}`;
    }

    // For numbers >= 1, use the existing logic
    const decimalPlaces = Math.max(0, significantDigits - quotientStr.length);
    return this.toFixed(decimalPlaces, rounding);
  }

  toFixed(decimalPlaces: number, rounding: Rounding = 'ROUND_HALF_UP'): string {
    const scalar = 10n ** BigInt(decimalPlaces);
    let result = (this.numerator * scalar) / this.denominator;

    if (rounding === 'ROUND_HALF_UP') {
      const remainder = (this.numerator * scalar) % this.denominator;
      if (remainder * 2n >= this.denominator) {
        result += 1n;
      }
    } else if (rounding === 'ROUND_UP') {
      if ((this.numerator * scalar) % this.denominator > 0n) {
        result += 1n;
      }
    }

    const str = result.toString();
    if (decimalPlaces === 0) return str;

    const insertAt = str.length - decimalPlaces;
    return insertAt <= 0
      ? `0.${'0'.repeat(-insertAt)}${str}`
      : `${str.slice(0, insertAt)}.${str.slice(insertAt)}`;
  }
}
