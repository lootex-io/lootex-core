import { getChain } from '@lootex-core/sdk/chains';

export const getBlockExplorerUrl = (
  chainIdOrShortName: number | string,
  address: string,
) => {
  const chain = getChain(chainIdOrShortName);
  const base = chain?.blockExplorers?.default?.url;

  if (!base) return '';

  return `${base}/address/${address}`;
};
