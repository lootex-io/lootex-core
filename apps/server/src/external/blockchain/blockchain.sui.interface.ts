/**
 * Blockchain/Sui
 * Interface Definitions
 */
import { isHexString as isHexStringEthers } from 'ethers/lib/utils';
import { Opaque } from '@/common/utils/utils.interface';

// @dev SuiAddress is a hex string, length not set (API specs)
export type SuiAddress = Opaque<string, 'SuiAddress'>;

// @dev type guard implementation for SuiAddress
const isSuiAddress = (str: string): str is SuiAddress => isHexStringEthers(str);

// @dev type contructor function
export const suiAddress = (input: unknown): SuiAddress => {
  if (typeof input !== 'string') {
    throw new Error('SuiAddress: Illegal input');
  }
  if (!isSuiAddress(input)) {
    throw new Error('SuiAddress: Invalid address format');
  }
  return input as SuiAddress;
};

// @dev Some from Sui codebase
type SerializedSignature = string;

export type SuiSignedMessage = {
  messageBytes: string; // Base64 Message Bytes
  signature: SerializedSignature;
};
