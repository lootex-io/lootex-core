/**
 * Utility Interfaces
 * - Types, Classes and Interfaces extending Native ones
 *   with general usage are here
 * @module
 */
import { isHexString as isHexStringEthers } from 'ethers/lib/utils';

// @dev Opaque assignment
export type Opaque<K, T> = T & { __TYPE__: K };

// @dev HexString type for general use
export type HexString = Opaque<string, 'HexString'>;

// @dev type guard implementation for HexString
const isHexString = (str: string): str is HexString => isHexStringEthers(str);

// @dev type contructor function
export const hexString = (input: string): HexString => {
  if (typeof input !== 'string') {
    throw new Error('HexString: Illegal input');
  }
  if (!isHexString(input)) {
    throw new Error('HexString: Input is not a Hex string. Prefix is required');
  }
  return input as HexString;
};

// @dev StringOfLength uses phantom type implementation to ensure
//      length compliance
export type StringOfLength<Min extends number, Max extends number> = string & {
  readonly StringOfLength: unique symbol;
};

// @dev type guard implementation for StringOfLength
const isStringOfLength = <Min extends number, Max extends number>(
  str: string,
  min: Min,
  max: Max,
): str is StringOfLength<Min, Max> => str.length >= min && str.length <= max;

// @dev type constructor function
export const stringOfLength = <Min extends number, Max extends number>(
  input: unknown,
  min: Min,
  max: Max,
): StringOfLength<Min, Max> => {
  if (typeof input !== 'string') {
    throw new Error('StringOfLength: Illegal input');
  }
  if (!isStringOfLength(input, min, max)) {
    throw new Error('StringOfLength: Input out of range');
  }
  return input as StringOfLength<Min, Max>;
};

export interface Pagination {
  page: number;
  limitPerPage: number;
  count: number;
  totalPage: number;
}
