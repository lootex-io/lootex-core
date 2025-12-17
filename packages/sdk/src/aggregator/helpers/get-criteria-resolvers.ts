import type { LootexOrder } from '../../order/types.js';

const getCriteriaResolvers = ({ orders }: { orders: LootexOrder[] }) => {
  // Return empty array if first order is not a Collection type
  if (orders[0].offerType !== 'Collection') {
    return [];
  }

  return orders.flatMap((order, orderIndex) =>
    // Map each criteria with its corresponding order index
    order.considerationCriteria.map((inputCriteria, criteriaIndex) => ({
      orderIndex: BigInt(orderIndex),
      index: BigInt(criteriaIndex),
      side: 1, // Side.CONSIDERATION
      identifier: BigInt(inputCriteria.identifier),
      criteriaProof: [],
    })),
  );
};

export default getCriteriaResolvers;
