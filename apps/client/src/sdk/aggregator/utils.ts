import { BrowserProvider, JsonRpcSigner } from 'ethers-v6';
import type { Account, Chain, Transport, WalletClient } from 'viem';

//temp for testing
export function walletClientToSigner(
  walletClient: WalletClient<Transport, Chain, Account>,
) {
  const { account, chain, transport } = walletClient;

  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };

  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account.address);

  return signer;
}

export const groupBy = <T>(
  array: T[],
  getKey: (item: T) => string,
): Record<string, T[]> => {
  return array.reduce(
    (acc, item) => {
      const key = getKey(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
};

export const map = <T, R>(
  obj: Record<string, T>,
  fn: (value: T, key: string) => R,
): R[] => {
  return Object.entries(obj).map(([key, value]) => fn(value, key));
};
