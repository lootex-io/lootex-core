import { USD } from '../token/constants';
import type { Token } from '../token/types';
import { CurrencyAmount } from './currency-amount';
import { type BigintIsh, Fraction, type Rounding } from './fraction';

export class Price<
  T1 extends Token = Token,
  T2 extends Token = Token,
> extends Fraction {
  readonly baseCurrency: T1;
  readonly quoteCurrency: T2;
  readonly scalar: Fraction;

  constructor(
    baseCurrency: T1,
    quoteCurrency: T2,
    denominator: BigintIsh,
    numerator: BigintIsh,
  ) {
    super(numerator, denominator);

    this.baseCurrency = baseCurrency;
    this.quoteCurrency = quoteCurrency;
    this.scalar = new Fraction(
      10n ** BigInt(baseCurrency.decimals),
      10n ** BigInt(quoteCurrency.decimals),
    );
  }

  static fromCurrencyAmounts(
    baseCurrencyAmount: CurrencyAmount,
    quoteCurrencyAmount: CurrencyAmount,
  ) {
    return new Price(
      baseCurrencyAmount.currency,
      quoteCurrencyAmount.currency,
      baseCurrencyAmount.quotient(),
      quoteCurrencyAmount.quotient(),
    );
  }

  quote(
    baseCurrencyAmount: CurrencyAmount = CurrencyAmount.fromFormattedAmount(
      this.baseCurrency,
      1,
    ),
  ) {
    const result = super.multiply(baseCurrencyAmount);

    return new CurrencyAmount(
      this.quoteCurrency,
      result.numerator,
      result.denominator,
    );
  }

  private get adjustedForDecimals(): Fraction {
    return super.multiply(this.scalar);
  }

  public toFixed(decimalPlaces = 8, rounding?: Rounding) {
    return this.adjustedForDecimals.toFixed(decimalPlaces, rounding);
  }

  public toSignificant(significantDigits = 8, rounding?: Rounding) {
    return this.adjustedForDecimals.toSignificant(significantDigits, rounding);
  }
}

export class UsdPrice<T extends Token = Token> extends Price {
  constructor(rate: number | string, baseCurrency: T) {
    const fraction = Fraction.fromDecimal(rate);

    super(
      baseCurrency,
      USD,
      fraction.denominator * 10n ** BigInt(baseCurrency.decimals),
      fraction.numerator * 10n ** 6n,
    );
  }
}
