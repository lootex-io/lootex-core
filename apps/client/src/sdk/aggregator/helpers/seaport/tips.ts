import {
  seaportTokenToCurrencyAmount,
  summarizeTokensOfOrders,
} from '../../../order/summary';
import type { LootexOrder } from '../../../order/types';

import { type ConsiderationItem, ItemType } from '../../../seaport/types';
import { Fraction } from '../../../utils/fraction';
import type { TipConfig } from '../../types';

import { isNativeToken } from '../../../token/token';

/**
 * Converts a tip configuration into a Seaport ConsiderationItem
 * @param tip - The tip configuration containing recipient address and percentage
 * @param order - The LootexOrder to calculate the tip from
 * @returns A ConsiderationItem representing the tip with calculated amounts
 */
export const tipConfigToConsiderationItem = (
  tip: TipConfig,
  order: LootexOrder,
): ConsiderationItem => {
  // Determine total price of the order
  const tokensOfOrder = summarizeTokensOfOrders([order]);

  // Only first token is considered for tip
  // Typically, you only have one type of token in the order
  const currencyAmount = tokensOfOrder.map((token) =>
    seaportTokenToCurrencyAmount(token),
  )[0];

  // Calculate tip amount
  const tipCurrencyAmount = currencyAmount.multiply(
    Fraction.fromDecimal(tip.percentage / 100),
  );

  return {
    itemType: isNativeToken(currencyAmount.currency)
      ? ItemType.NATIVE
      : ItemType.ERC20,
    token: currencyAmount.currency.address,
    identifierOrCriteria: '0',
    startAmount: tipCurrencyAmount.quotient().toString(),
    endAmount: tipCurrencyAmount.quotient().toString(),
    recipient: tip.recipient,
  };
};

/**
 * Adds tip ConsiderationItems to a LootexOrder
 * @param order - The original LootexOrder
 * @param tipsItems - Array of ConsiderationItems representing tips to add
 * @returns A new LootexOrder with the tips added to its consideration array
 */
export const addTipsToOrder = (
  order: LootexOrder,
  tipsItems: ConsiderationItem[],
): LootexOrder => {
  return {
    ...order,
    seaportOrder: {
      ...order.seaportOrder,
      parameters: {
        ...order.seaportOrder.parameters,
        consideration: [
          ...order.seaportOrder.parameters.consideration,
          ...tipsItems,
        ],
      },
    },
  };
};
