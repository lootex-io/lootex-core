import { encodeFunctionData } from 'viem';
import { groupBy, map } from '../aggregator/utils.js';
import type { Client } from '../client/index.js';
import type { LootexOrder } from '../order/types.js';
import { SEAPORT_1_6_ABI } from '../seaport/abi.js';
import type { TransactionData } from '../utils/transaction.js';

/**
 * Represents a step in the order cancellation process
 * @interface CancelOrdersStep
 */
export type CancelOrdersStep = {
  /** Identifier for the cancel orders step */
  id: 'cancel-orders';
  /** Array of transaction items to be processed */
  items: {
    /** Type of the item - always 'transaction' for cancel orders */
    type: 'transaction';
    /** Transaction data to be sent to the blockchain */
    data: TransactionData;
    /** Array of transaction hashes associated with the cancellations */
    hashes: `0x${string}`[];
  }[];
};

/**
 * Cancels multiple orders on the Lootex marketplace
 * @param {Object} params - The parameters for cancelling orders
 * @param {Client} params.client - The Lootex client instance
 * @param {LootexOrder[]} params.orders - Array of orders to cancel
 * @param {number} params.chainId - The blockchain network chain ID
 * @returns {Promise<{steps: CancelOrdersStep[]}>} A promise that resolves with the cancellation steps
 * @throws Will throw an error if the order cancellation fails
 */
export const cancelOrders = async ({
  client,
  orders,
  chainId,
}: {
  client: Client;
  orders: LootexOrder[];
  chainId: number;
}): Promise<{ steps: CancelOrdersStep[] }> => {
  const cancellableOrders = (
    await Promise.all(
      orders.map(async (order) => {
        const [, isCancelled] = await client
          .getPublicClient({ chainId })
          .readContract({
            address: order.exchangeAddress,
            abi: SEAPORT_1_6_ABI,
            functionName: 'getOrderStatus',
            args: [order.hash],
          });

        return {
          isCancelled,
          order,
        };
      }),
    )
  )
    ?.filter(({ isCancelled }) => !isCancelled)
    .map(({ order }) => order);

  const ordersByExchangeAddress = groupBy(
    cancellableOrders,
    ({ exchangeAddress }) => exchangeAddress,
  );

  return {
    steps: [
      {
        id: 'cancel-orders',
        items: map(ordersByExchangeAddress, (orders, _exchanageAddress) => {
          return {
            type: 'transaction',
            data: {
              to: _exchanageAddress as `0x${string}`,
              data: encodeFunctionData({
                abi: SEAPORT_1_6_ABI,
                functionName: 'cancel',
                args: [
                  //@ts-ignore
                  orders.map((order) => order.seaportOrder.parameters),
                ],
              }),
            },
            hashes: orders.map((order) => order.hash),
          };
        }),
      },
    ],
  };
};
