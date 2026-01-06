import type { LootexOrder } from '../../order/types';

type FulfillmentComponent = {
  orderIndex: bigint;
  itemIndex: bigint;
}[];

const getAdvancedAvailableParams = (
  orders: LootexOrder[],
): {
  offerFulfillments?: FulfillmentComponent[];
  considerationFulfillments?: FulfillmentComponent[];
  maximumFulfilled: bigint;
} => {
  const offerFulfillments: FulfillmentComponent[] = [];
  const considerationFulfillments: FulfillmentComponent[] = [];
  orders.forEach((order, orderIndex) => {
    order.seaportOrder.parameters.offer.forEach((_, itemIndex) => {
      return offerFulfillments.push([
        { orderIndex: BigInt(orderIndex), itemIndex: BigInt(itemIndex) },
      ]);
    });
    order.seaportOrder.parameters.consideration.forEach((_, itemIndex) => {
      return considerationFulfillments.push([
        { orderIndex: BigInt(orderIndex), itemIndex: BigInt(itemIndex) },
      ]);
    });
  });
  return {
    offerFulfillments,
    considerationFulfillments,
    maximumFulfilled: BigInt(orders.length),
  };
};

export default getAdvancedAvailableParams;
