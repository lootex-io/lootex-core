import { encodeFunctionData } from 'viem';
import { erc20WrappedAbi } from '../../abi/erc20-wrapped.js';
import { WETH9 } from '../../token/constants.js';
import { isNativeToken, isWrappedToken } from '../../token/token.js';
import type { Token } from '../../token/types.js';
import { CurrencyAmount } from '../../utils/currency-amount.js';
import { Price } from '../../utils/price.js';

import type { SwapAction } from '../types.js';

export const wrap = (token: Token) => {
  if (isNativeToken(token)) {
    const wrappedToken = WETH9[token.chainId];
    if (!wrappedToken) {
      throw new Error('Wrapped token not found');
    }
    return wrappedToken;
  }
  return token;
};

export const isWrapOrUnwrap = (tokenIn: Token, tokenOut: Token) => {
  return (
    (isNativeToken(tokenIn) && isWrappedToken(tokenOut)) ||
    (isWrappedToken(tokenIn) && isNativeToken(tokenOut))
  );
};

export const getWrappedTrade = async (
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string | number,
) => {
  const isWrapping = isNativeToken(tokenIn) && isWrappedToken(tokenOut);
  const wrappedToken = wrap(tokenIn); //  quick way to get wrapped token

  const currencyAmountIn = CurrencyAmount.fromFormattedAmount(
    tokenIn,
    amountIn,
  );
  const currencyAmountOut = CurrencyAmount.fromFormattedAmount(
    tokenOut,
    amountIn,
  );

  const action: SwapAction = {
    type: 'swap',
    buildTransaction: async () => ({
      to: wrappedToken.address,
      ...(isWrapping
        ? {
            data: encodeFunctionData({
              abi: erc20WrappedAbi,
              functionName: 'deposit',
            }),
            value: currencyAmountIn.quotient(),
          }
        : {
            data: encodeFunctionData({
              abi: erc20WrappedAbi,
              functionName: 'withdraw',
              args: [currencyAmountOut.quotient()],
            }),
          }),
    }),
  };

  return {
    currencyAmountIn,
    currencyAmountOut,
    executionPrice: new Price(
      tokenIn,
      tokenOut,
      currencyAmountIn.quotient(),
      currencyAmountOut.quotient(),
    ),
    getActions: async () => [action],
  };
};
