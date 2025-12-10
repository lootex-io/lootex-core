/**
 * Blockchain/Eth
 * Interface Definitions
 */
import { isHexString as isHexStringEthers } from 'ethers/lib/utils';
import { Opaque, StringOfLength } from '@/common/utils/utils.interface';

// @dev EthAddress is a hex string (length === 42)
export type EthAddress = Opaque<string, 'EthAddress'> & StringOfLength<42, 42>;

// @dev type guard implementation for EthAddress
const isEthAddress = (str: string): str is EthAddress => isHexStringEthers(str);

// @dev type contructor function
export const ethAddress = (input: unknown): EthAddress => {
  if (typeof input !== 'string') {
    throw new Error('EthAddress: Illegal input');
  }
  if (!isEthAddress(input)) {
    throw new Error('EthAddress: Invalid address format');
  }
  return input as EthAddress;
};
