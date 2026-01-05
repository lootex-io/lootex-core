import type { Token } from '../token/types';
import { type BigintIsh, Fraction, type Rounding } from './fraction';

type MinimalToken = Pick<Token, 'decimals'>;

export class CurrencyAmount<T extends MinimalToken = Token> extends Fraction {
  readonly currency: T;
  readonly decimalScale: bigint;

  static fromFractionalAmount<T extends MinimalToken>(
    currency: T,
    numerator: BigintIsh,
    denominator: BigintIsh,
  ) {
    return new CurrencyAmount(currency, numerator, denominator);
  }

  static fromFormattedAmount<T extends MinimalToken>(
    currency: T,
    formattedAmount: string | number,
  ) {
    const fraction = Fraction.fromDecimal(formattedAmount).multiply(
      10n ** BigInt(currency.decimals),
    );
    return CurrencyAmount.fromFractionalAmount(
      currency,
      fraction.numerator,
      fraction.denominator,
    );
  }

  static fromRawAmount<T extends MinimalToken>(
    currency: T,
    rawAmount: BigintIsh,
  ) {
    const fraction = new Fraction(rawAmount);

    return CurrencyAmount.fromFractionalAmount(
      currency,
      fraction.numerator,
      fraction.denominator,
    );
  }

  constructor(currency: T, numerator: BigintIsh, denominator?: BigintIsh) {
    super(numerator, denominator);
    this.currency = currency;
    this.decimalScale = 10n ** BigInt(currency.decimals);
  }

  add<T extends MinimalToken>(other: CurrencyAmount<T>) {
    const added = super.add(other);

    return CurrencyAmount.fromFractionalAmount(
      this.currency,
      added.numerator,
      added.denominator,
    );
  }

  subtract<T extends MinimalToken>(other: CurrencyAmount<T>) {
    const added = super.subtract(other);

    return CurrencyAmount.fromFractionalAmount(
      this.currency,
      added.numerator,
      added.denominator,
    );
  }

  multiply(other: Fraction | BigintIsh) {
    const multiplied = super.multiply(other);

    return CurrencyAmount.fromFractionalAmount(
      this.currency,
      multiplied.numerator,
      multiplied.denominator,
    );
  }

  toSignificant(significantDigits = 6, rounding?: Rounding): string {
    return super
      .divide(this.decimalScale)
      .toSignificant(significantDigits, rounding);
  }

  toFixed(
    decimalPlaces: number = this.currency.decimals,
    rounding?: Rounding,
  ): string {
    return super.divide(this.decimalScale).toFixed(decimalPlaces, rounding);
  }
}
