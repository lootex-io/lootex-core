import type { Client } from '../client/index';
import type { LootexOrder } from '../order/types';
import { fulfillOrders } from './fulfill-orders';

/**
 * Parameters for executing a buy operation on the Lootex marketplace
 * @interface BuyParams
 */
export type BuyParams = {
  /** The Lootex client instance */
  client: Client;
  /** The blockchain network chain ID */
  chainId: number;
  /** The Ethereum address of the buyer (must be prefixed with 0x) */
  accountAddress: `0x${string}`;
  /** Array of Lootex orders to be fulfilled */
  orders: LootexOrder[];
};

/**
 * Executes a buy operation for one or multiple orders on the Lootex marketplace
 * @param {BuyParams} params - The parameters for the buy operation
 * @returns {Promise<unknown>} A promise that resolves when the buy operation is complete
 * @throws Will throw an error if the buy operation fails
 */
export const buy = async (params: BuyParams) => {
  const { client, chainId, orders, accountAddress } = params;

  return fulfillOrders({
    client,
    chainId,
    orders,
    accountAddress,
  });
};
