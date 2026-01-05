import type { Token } from './types';

import { isAddressEqual, zeroAddress } from 'viem';
import { NATIVE, WETH9 } from './constants';

export const createToken = ({ chainId, address, decimals, symbol }: Token) => {
  return { chainId, address, decimals, symbol };
};

export const isTokenEqual = (token1: Token, token2: Token) => {
  if (!token1 || !token2) {
    throw new Error('Token missing');
  }

  if (
    token1.chainId === token2.chainId &&
    isAddressEqual(token1.address, token2.address)
    // We do not rely on symbol comparison as symbol might change
  ) {
    return true;
  }

  return false;
};

export const isNativeToken = (token: Token) => {
  return token.address === zeroAddress;
};

export const isWrappedToken = (token: Token) => {
  const weth9 = WETH9[token.chainId];
  if (!weth9) return false;

  return isAddressEqual(weth9.address, token.address);
};

export const toWrappedToken = (token: Token) => {
  if (isNativeToken(token)) {
    return WETH9[token.chainId];
  }

  return token;
};

/**
 * Converts a token to its legacy symbol representation. E.g. POL -> MATIC, WPOL -> WMATIC
 * This might be needed for some legacy api endpoints that do not accept the new symbol format
 * @param token The token to convert
 * @returns The legacy symbol string or the original symbol if no conversion is needed
 *
 * @example
 * const POL = NATIVE[137]
 * toLegacySymbol(POL) // Returns 'MATIC'
 *
 * @internal
 */
export const toLegacySymbol = (token: Token) => {
  // POL -> MATIC
  if (isTokenEqual(token, NATIVE[137])) {
    return 'MATIC';
  }

  // WPOL -> WMATIC
  if (isTokenEqual(token, WETH9[137])) {
    return 'WMATIC';
  }

  return token.symbol;
};
