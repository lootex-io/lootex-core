import { encodeFunctionData } from 'viem';
import type { LootexOrder } from '../../../order/types.js';

import { SEAPORT_1_6_ABI } from '../../../seaport/abi.js';
import getAdvancedAvailableParams from '../get-advanced-avalaible-params.js';
import getCriteriaResolvers from '../get-criteria-resolvers.js';
import getAdvancedOrders from './get-advanced-orders.js';

export const composeSeaportData = ({
  orders,
  fulfillerConduitKey,
  recipient,
}: {
  orders: LootexOrder[];
  fulfillerConduitKey: `0x${string}`;
  recipient: `0x${string}`;
}) => {
  // lootexOrder to advancedOrder
  const advancedOrders = getAdvancedOrders(orders);

  const { offerFulfillments, considerationFulfillments, maximumFulfilled } =
    getAdvancedAvailableParams(orders);

  // criteriaResolver
  const criteriaResolvers = getCriteriaResolvers({
    orders,
  });

  if (advancedOrders.length > 1) {
    if (!maximumFulfilled || !offerFulfillments || !considerationFulfillments) {
      throw new Error('maximumFulfilled is required for batch buy');
    }

    return encodeFunctionData({
      abi: SEAPORT_1_6_ABI,
      functionName: 'fulfillAvailableAdvancedOrders',
      args: [
        // @ts-ignore
        advancedOrders,
        criteriaResolvers,
        offerFulfillments,
        considerationFulfillments,
        fulfillerConduitKey,
        recipient,
        maximumFulfilled,
      ],
    });
  }

  return encodeFunctionData({
    abi: SEAPORT_1_6_ABI,
    functionName: 'fulfillAdvancedOrder',
    args: [
      // @ts-ignore
      advancedOrders[0],
      criteriaResolvers,
      fulfillerConduitKey,
      recipient,
    ],
  });
};
