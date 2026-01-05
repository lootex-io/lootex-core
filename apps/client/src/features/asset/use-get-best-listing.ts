import { apiClient } from '@/lib/lootex';
import { useQuery } from '@tanstack/react-query';
import type { Asset } from '@/sdk/exports/asset';
import { getChain } from '@/sdk/exports/chains';

export const useGetBestListing = ({
  asset,
}: {
  asset?: Asset;
}) => {
  const assetId = `${asset?.collectionChainShortName}/${asset?.contractAddress}/${asset?.assetTokenId}`;

  return useQuery({
    queryKey: ['asset-listings', { assetId }],
    queryFn: () =>
      apiClient.orders.getOrders({
        chainId:
          asset?.contractChainId || asset?.collectionChainShortName
            ? getChain(asset?.collectionChainShortName).id
            : undefined,
        contractAddress: asset?.contractAddress,
        tokenId: asset?.assetTokenId,
        category: 'LISTING',
        endTimeGt: Math.floor(Date.now() / 1000),
        sortBy: [
          ['price', 'ASC'],
          ['endTime', 'ASC'],
        ],
        isCancelled: false,
        isFillable: true,
        isExpired: false,
        limit: 1,
        page: 1,
      }),
    enabled: !!asset?.contractAddress && !!asset?.assetTokenId,
  });
};
