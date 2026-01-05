import { getAddress } from 'viem';
import { ItemType } from '../../../seaport/types';
import { isNativeToken } from '../../../token/token';
import type { Token } from '../../../token/types';
import type { CurrencyAmount } from '../../../utils/currency-amount';
import { Fraction } from '../../../utils/fraction';

export const formatFeeConsiderations = ({
  fees,
  totalPrice,
}: {
  fees: { percentage: number; recipient: `0x${string}` }[];
  totalPrice: CurrencyAmount<Token>;
}) => {
  return fees.map((fee) => {
    const currencyAmount = totalPrice.multiply(
      Fraction.fromDecimal(fee.percentage / 100),
    );

    return {
      itemType:
        ItemType[isNativeToken(currencyAmount.currency) ? 'NATIVE' : 'ERC20'],
      token: getAddress(currencyAmount.currency.address),
      identifier: '0',
      amount: currencyAmount.quotient().toString(),
      recipient: fee.recipient,
    };
  });
};
