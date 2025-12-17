import { getChain } from '../chains/constants.js';
import type { RequireAtLeastOne } from './ts-helpers.js';

export type ValueOrData = RequireAtLeastOne<{
  data: `0x${string}`;
  value: bigint;
}>;

export type TransactionData = {
  to: `0x${string}`;
} & ValueOrData;

/**
 * Gets the block explorer URL for a transaction receipt
 * @param params.chainId - The chain ID of the network
 * @param params.txHash - The transaction hash
 * @returns The block explorer URL for viewing the transaction
 *
 * @example
 * getTransactionExplorerUrl({ chainId: 1, txHash: '0x1234567890123456789012345678901234567890' })
 * // returns 'https://etherscan.io/tx/0x1234567890123456789012345678901234567890'
 */

export const getTransactionExplorerUrl = ({
  chainId,
  txHash,
}: {
  chainId: number;
  txHash: `0x${string}`;
}) => {
  const chain = getChain(chainId);

  return `${chain?.blockExplorers?.default.url}/tx/${txHash}`;
};
