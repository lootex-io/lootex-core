import { isAddressEqual } from 'viem';
import type { Account } from './types.js';

export const hasWallet = (account?: Account, walletAddress?: `0x${string}`) => {
  if (!account || !walletAddress) return false;

  return !!account?.wallets?.find((w) =>
    isAddressEqual(w.address, walletAddress),
  );
};

export const isAdmin = (account?: Account) => {
  return !!account?.roles?.includes('admin');
};
