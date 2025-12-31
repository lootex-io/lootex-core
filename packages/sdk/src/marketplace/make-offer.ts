import type { Client } from '../client/index.js';
import { type CreateOrderData, createOrders } from './create-orders.js';

/**
 * Parameters for making an offer on the Lootex marketplace
 * @interface MakeOfferParams
 */
export type MakeOfferParams = {
  /** The Lootex client instance */
  client: Client;
  /** The blockchain network chain ID */
  chainId: number;
  /** The Ethereum address of the offer maker (must be prefixed with 0x) */
  accountAddress: `0x${string}`;
  /** The order data containing details of the offer */
  data: CreateOrderData;
};

/**
 * Creates an offer order on the Lootex marketplace
 *
 * @param {MakeOfferParams} params - The parameters for creating the offer
 * @returns {Promise<unknown>} A promise that resolves with the created offer order
 * @throws Will throw an error if the offer creation fails
 */
export const makeOffer = async (params: MakeOfferParams) => {
  const { client, chainId, accountAddress, data } = params;

  return createOrders({
    client,
    chainId,
    category: 'OFFER',
    accountAddress,
    data,
  });
};
