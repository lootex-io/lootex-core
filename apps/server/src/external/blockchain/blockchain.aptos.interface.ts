/**
 * Blockchain/Aptos
 * Interface Definitions
 */
import { isHexString as isHexStringEthers } from 'ethers/lib/utils';
import { Opaque, StringOfLength } from '@/common/utils/utils.interface';

// @dev AptosAddress is a hex string (length === 66)
// NOTE: usually, it is represented in unprefixed format,
//       but we save prefixed addresses for HEX strings
export type AptosAddress = Opaque<string, 'AptosAddress'> &
  StringOfLength<66, 66>;

// @dev type guard implementation for AptosAddress
const isAptosAddress = (str: string): str is AptosAddress =>
  isHexStringEthers(str);

// @dev type contructor function
export const aptosAddress = (input: unknown): AptosAddress => {
  if (typeof input !== 'string') {
    throw new Error('AptosAddress: Illegal input');
  }
  const prefixedInput = input.length === 64 ? `0x${input}` : input;
  if (!isAptosAddress(prefixedInput)) {
    throw new Error('AptosAddress: Invalid address format');
  }
  return prefixedInput as AptosAddress;
};
