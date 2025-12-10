/**
 * Blockchain/Flow
 * Interface Definitions
 */
import { isHexString as isHexStringEthers } from 'ethers/lib/utils';
import { Opaque, StringOfLength } from '@/common/utils/utils.interface';

// @dev FlowCompositeSignature is the schema for fcl v1 comp signatures
export interface FlowCompositeSignature {
  f_type: string;
  f_vsn: string;
  addr: string;
  keyId: number;
  signature: string;
}

// @dev FlowAddress is a hex string (length === 18)
export type FlowAddress = Opaque<string, 'FlowAddress'> &
  StringOfLength<18, 18>;

// @dev type guard implementation for FlowAddress
const isFlowAddress = (str: string): str is FlowAddress =>
  isHexStringEthers(str);

// @dev type contructor function
export const flowAddress = (input: unknown): FlowAddress => {
  if (typeof input !== 'string') {
    throw new Error('FlowAddress: Illegal input');
  }
  const prefixedInput = input.length === 16 ? `0x${input}` : input;
  if (!isFlowAddress(prefixedInput)) {
    throw new Error('FlowAddress: Invalid address format');
  }
  return prefixedInput as FlowAddress;
};
