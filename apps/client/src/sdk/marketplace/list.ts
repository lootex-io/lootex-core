import type { Client } from '../client/index';
import { type CreateOrderData, createOrders } from './create-orders';

/**
 * Parameters for listing items on the marketplace
 * @interface ListParams
 * @property {Client} client - The client instance for interacting with the marketplace
 * @property {number} chainId - The ID of the blockchain network
 * @property {`0x${string}`} accountAddress - The Ethereum address of the account listing the items
 * @property {CreateOrderData} data - The order data containing items to be listed
 * @property {boolean} [enableBulkOrder] - Optional flag to enable bulk order creation
 */
export type ListParams = {
  client: Client;
  chainId: number;
  accountAddress: `0x${string}`;
  data: CreateOrderData;
  enableBulkOrder?: boolean;
};

/**
 * Creates a listing order on the marketplace
 *
 * @param {ListParams} params - The parameters for creating the listing
 * @returns {Promise<unknown>} A promise that resolves with the created order(s)
 * @throws Will throw an error if the order creation fails
 */
export const list = async (params: ListParams) => {
  const { client, chainId, accountAddress, data, enableBulkOrder } = params;

  return createOrders({
    client,
    chainId,
    category: 'LISTING',
    accountAddress,
    data,
    enableBulkOrder,
  });
};
