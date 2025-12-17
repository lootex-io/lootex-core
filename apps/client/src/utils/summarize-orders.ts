import type { LootexOrder } from '@lootex-core/sdk/order';
import type { Token } from '@lootex-core/sdk/token';
import { CurrencyAmount } from '@lootex-core/sdk/utils';

export const summarizeOrders = (orders: LootexOrder[]) => {
  const currencyAmountsByOrders = orders.map((order) => {
    const {
      seaportOrder: {
        parameters: { consideration, offer },
      },
      chainId,
      priceSymbol,
      currencies,
    } = order;

    const currency = currencies[0] as Token;

    if (!currency) {
      throw new Error(
        `Token not found for symbol: ${priceSymbol}, chainId: ${chainId}`,
      );
    }

    if (offer[0].itemType === 1) {
      // Must be an offer
      // first item is the price
      return new CurrencyAmount(currency, offer[0].startAmount);
    }
    // otherwise it's a listing
    // suming up all considerations get you the price
    return consideration.reduce<CurrencyAmount>(
      (acc, consideration) => {
        return acc.add(new CurrencyAmount(currency, consideration.startAmount));
      },
      new CurrencyAmount(currency, BigInt(0)),
    );
  });

  const currencyAmounts = Object.entries(
    currencyAmountsByOrders.reduce<
      Record<string, Record<string, CurrencyAmount<Token>>>
    >((previous, current) => {
      // calculate total token amount with different symbol and chainId
      const previousCurrencyAmount =
        previous?.[current.currency.chainId]?.[current.currency.symbol];

      const currencyAmount = previousCurrencyAmount?.add(current) ?? current;

      previous[current.currency.chainId] = {
        ...(previous[current.currency.chainId] ?? {}),
        [current.currency.symbol]: currencyAmount,
      };
      return previous;
    }, {}),
  ).flatMap(([, chainCurrencyAmounts]) => {
    return Object.entries(chainCurrencyAmounts).map(([, currencyAmount]) => {
      return currencyAmount;
    });
  });

  return {
    orders,
    currencyAmounts,
  };
};
