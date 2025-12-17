import {
  decodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  isAddressEqual,
  maxInt256,
} from 'viem';

import type { Client } from '../../client/index.js';
import { isNativeToken } from '../../token/token.js';
import type { Token } from '../../token/types.js';
import { CurrencyAmount } from '../../utils/currency-amount.js';
import { Fraction } from '../../utils/fraction.js';
import { Price } from '../../utils/price.js';
import { pancakeSwapV3Abi, quoterAbi, smartRouterAbi } from '../abi.js';
import { pools, quoters, routers } from '../config.js';
import type { IBaseSwapAdapter, SwapAction } from '../types.js';
import { getWrappedTrade, isWrapOrUnwrap, wrap } from './helpers.js';

function encodePath(
  path: (string | undefined)[],
  fees: number[],
): `0x${string}` {
  if (path.length !== fees.length + 1) {
    throw new Error('path/fee lengths do not match');
  }

  let encoded = '0x';
  for (let i = 0; i < fees.length; i++) {
    if (!path[i]) {
      throw new Error('path is missing');
    }
    // 20 byte encoding of the address
    encoded += path[i]?.slice(2);
    // 3 byte encoding of the fee
    encoded += fees[i].toString(16).padStart(2 * 3, '0');
  }
  // encode the final token
  encoded += path?.[path.length - 1]?.slice(2);

  return encoded.toLowerCase() as `0x${string}`;
}

const getRouteConfig = (tokenIn: Token, tokenOut: Token) => {
  const singlePool = pools[tokenIn.chainId].find(
    (pool) =>
      (isAddressEqual(pool.token0, tokenIn.address) &&
        isAddressEqual(pool.token1, tokenOut.address)) ||
      (isAddressEqual(pool.token0, tokenOut.address) &&
        isAddressEqual(pool.token1, tokenIn.address)),
  );

  if (singlePool) {
    return {
      path: encodePath([tokenIn.address, tokenOut.address], [singlePool.fee]),
    };
  }

  const tokenInPool = pools[tokenIn.chainId].find(
    (pool) =>
      isAddressEqual(pool.token0, tokenIn.address) ||
      isAddressEqual(pool.token1, tokenIn.address),
  );

  const tokenOutPool = pools[tokenOut.chainId].find(
    (pool) =>
      isAddressEqual(pool.token0, tokenOut.address) ||
      isAddressEqual(pool.token1, tokenOut.address),
  );

  if (!tokenInPool || !tokenOutPool) {
    throw new Error('Pool not found for one or both tokens');
  }

  let overlappingToken = null;

  for (const inToken of [tokenInPool.token0, tokenInPool.token1]) {
    for (const outToken of [tokenOutPool.token0, tokenOutPool.token1]) {
      if (isAddressEqual(inToken, outToken)) {
        overlappingToken = inToken;
        break;
      }
    }
    if (overlappingToken) break;
  }

  if (overlappingToken) {
    return {
      path: encodePath(
        [tokenIn.address, overlappingToken, tokenOut.address],
        [tokenInPool.fee, tokenOutPool.fee],
      ),
    };
  }

  // TODO: handle routes requireing 3 pools
  throw new Error('No overlapping token found between the pools');
};

const getUnwrapWETH9Params = (
  amount: bigint,
  accountAddress: `0x${string}`,
) => {
  return encodeFunctionData({
    abi: smartRouterAbi,
    functionName: 'unwrapWETH9',
    args: [amount, accountAddress],
  });
};

export class UniswapV3SwapAdapter implements IBaseSwapAdapter {
  readonly chainId: number;
  readonly client: Client;
  readonly swapAddress: `0x${string}`;
  readonly quoterAddress: `0x${string}`;

  constructor(config: { chainId: number; client: Client }) {
    const { chainId, client } = config;
    this.chainId = chainId;
    this.client = client;
    this.swapAddress = routers[chainId];
    this.quoterAddress = quoters[chainId];
  }

  private getSwapExactInputParams(
    path: `0x${string}`,
    recipient: `0x${string}`,
    amountIn: bigint,
    amountOutMinimum: bigint,
  ) {
    if (this.chainId === 56) {
      return encodeFunctionData({
        abi: pancakeSwapV3Abi,
        functionName: 'exactInput',
        args: [
          {
            path: path,
            recipient: recipient,
            deadline: maxInt256,
            amountIn,
            amountOutMinimum,
          },
        ],
      });
    }

    return encodeFunctionData({
      abi: smartRouterAbi,
      functionName: 'exactInput',
      args: [
        {
          path: path,
          recipient: recipient,
          amountIn,
          amountOutMinimum,
        },
      ],
    });
  }

  private getSwapExactOutputParams(
    path: `0x${string}`,
    recipient: `0x${string}`,
    amountOut: bigint,
    amountInMaximum: bigint,
  ) {
    if (this.chainId === 56) {
      return encodeFunctionData({
        abi: pancakeSwapV3Abi,
        functionName: 'exactOutput',
        args: [
          {
            path: path,
            recipient: recipient,
            deadline: maxInt256,
            amountOut,
            amountInMaximum,
          },
        ],
      });
    }

    return encodeFunctionData({
      abi: smartRouterAbi,
      functionName: 'exactOutput',
      args: [
        {
          path: path,
          recipient: recipient,
          amountOut,
          amountInMaximum,
        },
      ],
    });
  }

  private async getApprovalActions(
    maxCurrencyAmountIn: CurrencyAmount,
    accountAddress: `0x${string}`,
  ): Promise<SwapAction[]> {
    if (isNativeToken(maxCurrencyAmountIn.currency)) {
      return [];
    }

    const tokenAddress = maxCurrencyAmountIn.currency.address;
    const allowance = await this.client
      .getPublicClient({ chainId: this.chainId })
      .readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [accountAddress, this.swapAddress],
      });

    if (maxCurrencyAmountIn.greaterThan(allowance)) {
      return [
        {
          type: 'approve',
          buildTransaction: async () => ({
            to: tokenAddress,
            data: encodeFunctionData({
              abi: erc20Abi,
              functionName: 'approve',
              args: [this.swapAddress, maxInt256],
            }),
          }),
        },
      ];
    }
    return [];
  }

  private async getQuote(
    tokenIn: Token,
    tokenOut: Token,
    tradeType: 'exactInput' | 'exactOutput',
    inputAmount: string | number,
  ) {
    const wrappedTokenIn = wrap(tokenIn);
    const wrappedTokenOut = wrap(tokenOut);

    const { path } = getRouteConfig(
      tradeType === 'exactInput' ? wrappedTokenIn : wrappedTokenOut,
      tradeType === 'exactInput' ? wrappedTokenOut : wrappedTokenIn,
    );
    const inputCurrencyAmount = CurrencyAmount.fromFormattedAmount(
      tradeType === 'exactInput' ? wrappedTokenIn : wrappedTokenOut,
      inputAmount,
    );

    const result = await this.client
      .getPublicClient({ chainId: this.chainId })
      .call({
        to: this.quoterAddress,
        data: encodeFunctionData({
          functionName:
            tradeType === 'exactInput' ? 'quoteExactInput' : 'quoteExactOutput',
          abi: quoterAbi,
          args: [path, inputCurrencyAmount.quotient()],
        }),
      });

    if (!result?.data) {
      throw new Error('Unable to get quote');
    }

    const [amountOut] = decodeAbiParameters(
      [
        {
          type: 'uint256',
        },
      ],
      result.data,
    );

    const currencyAmountIn = new CurrencyAmount(
      tokenIn,
      tradeType === 'exactInput' ? inputCurrencyAmount.quotient() : amountOut,
    );
    const currencyAmountOut = new CurrencyAmount(
      tokenOut,
      tradeType === 'exactInput' ? amountOut : inputCurrencyAmount.quotient(),
    );

    return {
      currencyAmountIn,
      currencyAmountOut,
      path,
      executionPrice: new Price(
        tokenIn,
        tokenOut,
        currencyAmountIn.quotient(),
        currencyAmountOut.quotient(),
      ),
    };
  }

  public async getExactInputTrade(
    tokenIn: Token,
    tokenOut: Token,
    amountIn: string | number,
    accountAddress: `0x${string}`,
    slippage: number,
  ) {
    if (isWrapOrUnwrap(tokenIn, tokenOut)) {
      return getWrappedTrade(tokenIn, tokenOut, amountIn);
    }

    const { currencyAmountIn, currencyAmountOut, path, executionPrice } =
      await this.getQuote(tokenIn, tokenOut, 'exactInput', amountIn);

    const getActions = async () => {
      const currencyAmountOutMin = currencyAmountOut.multiply(
        new Fraction(1).subtract(Fraction.fromDecimal(slippage).divide(100)),
      );

      const unwrapWETH9Params = getUnwrapWETH9Params(
        currencyAmountOutMin.quotient(),
        accountAddress,
      );

      const approvalActions = await this.getApprovalActions(
        currencyAmountIn,
        accountAddress,
      );

      const swapAction: SwapAction = {
        type: 'swap',
        buildTransaction: async () => ({
          to: this.swapAddress,
          data: isNativeToken(tokenOut)
            ? encodeFunctionData({
                abi: smartRouterAbi,
                functionName: 'multicall',
                args: [
                  [
                    this.getSwapExactInputParams(
                      path,
                      this.swapAddress,
                      currencyAmountIn.quotient(),
                      currencyAmountOutMin.quotient(),
                    ),
                    unwrapWETH9Params,
                  ],
                ],
              })
            : this.getSwapExactInputParams(
                path,
                accountAddress,
                currencyAmountIn.quotient(),
                currencyAmountOutMin.quotient(),
              ),
          value: isNativeToken(tokenIn) ? currencyAmountIn.quotient() : 0n,
        }),
      };

      return [...approvalActions, swapAction];
    };

    return {
      currencyAmountIn,
      currencyAmountOut,
      executionPrice,
      getActions,
    };
  }

  public async getExactOutputTrade(
    tokenIn: Token,
    tokenOut: Token,
    amountOut: string | number,
    accountAddress: `0x${string}`,
    slippage: number,
  ) {
    if (isWrapOrUnwrap(tokenIn, tokenOut)) {
      return getWrappedTrade(tokenIn, tokenOut, amountOut);
    }

    const { currencyAmountIn, currencyAmountOut, path, executionPrice } =
      await this.getQuote(tokenIn, tokenOut, 'exactOutput', amountOut);

    const getActions = async () => {
      const currencyAmountInMax = currencyAmountIn.multiply(
        new Fraction(1).add(Fraction.fromDecimal(slippage).divide(100)),
      );

      const approvalActions = await this.getApprovalActions(
        currencyAmountInMax,
        accountAddress,
      );

      const unwrapWETH9Params = getUnwrapWETH9Params(
        currencyAmountOut.quotient(),
        accountAddress,
      );

      const swapAction: SwapAction = {
        type: 'swap',
        buildTransaction: async () => ({
          to: this.swapAddress,
          data: isNativeToken(tokenOut)
            ? encodeFunctionData({
                abi: smartRouterAbi,
                functionName: 'multicall',
                args: [
                  [
                    this.getSwapExactOutputParams(
                      path,
                      this.swapAddress,
                      currencyAmountOut.quotient(),
                      currencyAmountInMax.quotient(),
                    ),
                    unwrapWETH9Params,
                  ],
                ],
              })
            : this.getSwapExactOutputParams(
                path,
                accountAddress,
                currencyAmountOut.quotient(),
                currencyAmountInMax.quotient(),
              ),
          value: isNativeToken(tokenIn) ? currencyAmountIn.quotient() : 0n,
        }),
      };

      return [...approvalActions, swapAction];
    };

    return {
      currencyAmountIn,
      currencyAmountOut,
      executionPrice,
      getActions,
    };
  }
}
