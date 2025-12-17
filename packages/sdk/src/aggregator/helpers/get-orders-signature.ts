import { createApiClient } from '../../api/api-client.js';
import type { Client } from '../../client/index.js';
import { isOpenseaOrder } from '../../order/helpers.js';
import type { LootexOrder } from '../../order/types.js';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// get opensea orders signature
// return same orders from input with signature
const getOpenseaOrdersSignature = async ({
  orders,
  client,
}: {
  orders: LootexOrder[];
  client: Client;
}) => {
  const apiClient = createApiClient({ client });
  return Promise.all(
    orders.map(async (order) => {
      if (isOpenseaOrder(order) && !order.seaportOrder.signature) {
        try {
          const [data] = await Promise.all([
            apiClient.orders.getOpenseaSignature([
              {
                orderHash: order.hash,
                chainId: order.chainId,
                exChangeAddress: order.exchangeAddress,
                fulfillerAddress: order.offerer,
              },
            ]),
            delay(500),
          ]);
          if (!data) throw new Error('Failed to get opensea signature');
          return {
            ...order,
            seaportOrder: {
              ...order.seaportOrder,
              signature: data?.[0]?.signature,
            },
          };
        } catch (e) {
          return order;
        }
      }
      return order;
    }),
  );
};

// get orders with signature
// return orders with signature and without signature
export const getOrdersWithSignature = async ({
  orders,
  client,
}: {
  orders: LootexOrder[];
  client: Client;
}) => {
  const _orders = await getOpenseaOrdersSignature({ orders, client });
  const ordersWithSignature = _orders.filter(
    (order) => !!order?.seaportOrder.signature && !!order,
  ) as LootexOrder[];
  const ordersWithoutSignature = _orders.filter(
    (order) => !order?.seaportOrder.signature,
  );

  return {
    ordersWithSignature,
    ordersWithoutSignature,
  };
};
