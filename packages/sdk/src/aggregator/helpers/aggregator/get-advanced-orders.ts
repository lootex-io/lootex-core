import { isAddressEqual } from 'viem';
import { getOrderQuantity, getPlatformType } from '../../../order/helpers.js';
import type { LootexOrder } from '../../../order/types.js';

import type { AdvancedOrder } from '../../../seaport/types.js';

const getAdvancedOrder = (order: LootexOrder): AdvancedOrder => {
  const parameters = order.seaportOrder.parameters;
  const totalSize = BigInt(getOrderQuantity(order) ?? 1n);

  const { numerator, denominator } = getAdvancedOrderNumeratorDenominator(
    totalSize,
    order.unitsToFill,
  );
  return {
    parameters: {
      offerer: order.offerer,
      zone: parameters.zone,
      offer: parameters.offer,
      consideration: sortOpenseaConsiderations(order),
      orderType: parameters.orderType,
      startTime: parameters.startTime,
      endTime: parameters.endTime,
      zoneHash: parameters.zoneHash,
      salt: parameters.salt,
      conduitKey: parameters.conduitKey,
      totalOriginalConsiderationItems:
        parameters.totalOriginalConsiderationItems,
    },
    numerator,
    denominator,
    signature: order.seaportOrder.signature,
    extraData: '0x',
  };
};

const getAdvancedOrders = (orders: LootexOrder[]): AdvancedOrder[] => {
  return orders.map((order) => getAdvancedOrder(order));
};

export function getAdvancedOrderNumeratorDenominator(
  totalSize: bigint,
  unitsToFill?: bigint,
) {
  let numerator = 1n;
  let denominator = 1n;
  if (unitsToFill) {
    const unitsGcd = gcd(BigInt(unitsToFill), totalSize);
    numerator = BigInt(unitsToFill) / unitsGcd;
    denominator = totalSize / unitsGcd;
  }

  return { numerator, denominator };
}

const gcd = (a: bigint, b: bigint): bigint => {
  const bnA = BigInt(a);
  const bnB = BigInt(b);

  if (bnA === 0n) {
    return bnB;
  }

  return gcd(bnB % bnA, bnA);
};

// temperaly alternative before backend fix opensea order index
export const sortOpenseaConsiderations = (
  order: LootexOrder,
): LootexOrder['seaportOrder']['parameters']['consideration'] => {
  const considerations = order.seaportOrder.parameters.consideration;
  if (getPlatformType(order.platformType) !== 'OpenSea') {
    return considerations;
  }

  const mainConsideration = considerations[0];

  const openseaFeeCollector = '0x0000a26b00c1F0DF003000390027140000fAa719';

  // opensea fee collector should be the first
  const restConsiderations = considerations.slice(1);
  restConsiderations.sort((a) => {
    if (isAddressEqual(a.recipient as `0x${string}`, openseaFeeCollector)) {
      return -1;
    }
    return 1;
  });
  return [mainConsideration, ...restConsiderations];
};

export default getAdvancedOrders;
