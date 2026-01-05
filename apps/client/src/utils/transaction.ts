import { getChain } from '@/sdk/exports/chains';

export const extractTransferedTokensFromLogs = (logs: string[]) => {
  const transferLogs = logs.filter(
    (log) =>
      log.includes('[ERC721:transfer]') || log.includes('[ERC1155:transfer]'),
  );
  if (transferLogs.length === 0) return [];

  const tokenIds = transferLogs
    .map((log) => {
      const match = log.match(/tokenId: (\d+)/);
      return match ? match[1] : null;
    })
    .filter((id): id is string => id !== null);

  return tokenIds;
};
