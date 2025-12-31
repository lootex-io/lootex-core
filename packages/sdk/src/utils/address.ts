import { getAddress, isAddress } from 'viem';

/**
 * Format an address to a more readable format
 *
 * @param address - The address to format
 * @param n - The number of characters to keep at the beginning
 * @param p - The number of characters to keep at the end
 * @returns The formatted address
 * @example
 * ```ts
 * formatAddress('0xbF6692795A07684147838fC54A2764aa884C440c') // '0xbF66...440c'
 * formatAddress('0xbF6692795A07684147838fC54A2764aa884C440c', 8, 8) // '0xbF6692...884C440c'
 * ```
 */
export const formatAddress = (address = '', n = 6, p = 4): string => {
  if (!isAddress(address)) {
    return '';
  }

  const _address = getAddress(address);

  return `${_address.slice(0, n)}...${_address.slice(-p)}`;
};
