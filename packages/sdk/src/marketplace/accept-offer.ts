import type { Client } from '../client/index.js';
import type { LootexOrder } from '../order/types.js';
import { fulfillOrders } from './fulfill-orders.js';

/**
 * Parameters for accepting an offer on the Lootex marketplace
 * @interface AcceptOfferParams
 */
export type AcceptOfferParams = {
  /** The Lootex client instance */
  client: Client;
  /** The blockchain network chain ID */
  chainId: number;
  /** The Ethereum address of the offer acceptor (must be prefixed with 0x) */
  accountAddress: `0x${string}`;
  /** The offer order to accept */
  order: LootexOrder;
};

/**
 * Accepts an offer order on the Lootex marketplace
 * @param {AcceptOfferParams} params - The parameters for accepting the offer
 * @returns {Promise<unknown>} A promise that resolves when the offer is accepted
 * @throws Will throw an error if the offer acceptance fails
 */
export const acceptOffer = (params: AcceptOfferParams) => {
  const { client, chainId, accountAddress, order } = params;

  return fulfillOrders({
    client,
    chainId,
    accountAddress,
    orders: [order],
    isFullfillOffer: true,
  });
};
