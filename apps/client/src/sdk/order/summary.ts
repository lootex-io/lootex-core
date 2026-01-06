import { isAddressEqual } from 'viem';
import { getAdvancedOrderNumeratorDenominator } from '../aggregator/helpers/aggregator/get-advanced-orders';
import { getChain } from '../chains/constants';
import { ItemType } from '../seaport/types';
import { NATIVE, WETH9 } from '../token/constants';
import type { Token } from '../token/types';
import { CurrencyAmount } from '../utils/currency-amount';
import { getOrderQuantity } from './helpers';
import type { LootexOrder } from './types';

export const summarizeTokensOfOrders = (orders: LootexOrder[]) => {
  const tokensOfOrders = orders.map((order) => {
    const {
      seaportOrder: {
        parameters: { consideration, offer },
      },
      chainId,
      unitsToFill,
    } = order;

    if (offer[0].itemType === ItemType.ERC20) {
      // Must be an offer
      // first item is the price
      return {
        type: 'ERC20',
        address: offer[0].token as `0x${string}`,
        amount: BigInt(offer[0].startAmount),
        chainId,
      };
    }

    const totalSize = BigInt(getOrderQuantity(order) ?? 1n);

    const { numerator, denominator } = getAdvancedOrderNumeratorDenominator(
      totalSize,
      unitsToFill,
    );

    // otherwise it's a listing
    // suming up all considerations get you the price
    return consideration.reduce(
      (acc, consideration) => {
        const considerationAmount =
          (BigInt(consideration.startAmount) * numerator) / denominator;

        return {
          type: acc.type,
          address: acc.address as `0x${string}`,
          amount: acc.amount + considerationAmount,
          chainId: acc.chainId,
        };
      },
      {
        type: consideration[0].itemType === ItemType.ERC20 ? 'ERC20' : 'NATIVE',
        address: consideration[0].token as `0x${string}`,
        amount: 0n,
        chainId,
      },
    );
  });

  const tokens = Object.values(
    tokensOfOrders.reduce<
      Record<
        string,
        {
          address: `0x${string}`;
          amount: bigint;
          chainId: number;
          type: string;
        }
      >
    >((acc, current) => {
      const key = `${current.address}-${current.chainId}`;

      if (!acc[key]) {
        acc[key] = { ...current };
      } else {
        acc[key].amount += current.amount;
      }

      return acc;
    }, {}),
  );

  return tokens;
};

export const seaportTokenToCurrencyAmount = (token: {
  type: string;
  address: `0x${string}`;
  amount: bigint;
  chainId: number;
}) => {
  const chain = getChain(token.chainId);

  if (!chain) {
    throw new Error(
      `Chain not found for seaport token ${JSON.stringify(token)}`,
    );
  }

  let currency: Token;

  if (token.type === 'NATIVE') {
    currency = NATIVE[token.chainId];
  } else if (isAddressEqual(token.address, WETH9[token.chainId].address)) {
    currency = WETH9[token.chainId];
  } else {
    throw new Error(`Unknown seaport token ${JSON.stringify(token)}`);
  }

  return CurrencyAmount.fromRawAmount(currency, token.amount);
};
