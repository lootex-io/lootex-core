/**
 * Blockchain/Sol
 * Interface Definitions
 */
import { decode as decodeBase58 } from 'bs58';
import { Opaque, StringOfLength } from '@/common/utils/utils.interface';

// @dev SolAddress is Base 58 string that's 32 bytes long
export type SolAddress = Opaque<string, 'SolAddress'> & StringOfLength<32, 44>;

// @dev type guard implementation for SolAddress
const isSolAddress = (str: string): str is SolAddress =>
  decodeBase58(str).length === 32;

// @dev type contructor function
export const solAddress = (input: unknown): SolAddress => {
  if (typeof input !== 'string') {
    throw new Error('SolAddress: Illegal input');
  }
  if (!isSolAddress(input)) {
    throw new Error('SolAddress: Invalid address format');
  }
  return input as SolAddress;
};
