import { apiClient } from '@/lib/lootex';
import { useItemsQuery } from '@/lib/use-items-query';
import type { Asset } from '@/sdk/exports/asset';
import { getChain } from '@/sdk/exports/chains';
import type { LootexOrder } from '@/sdk/exports/order';

export const useGetOffers = ({
  asset,
}: {
  asset?: Asset;
}) => {
  const params = {
    chainId:
      asset?.contractChainId || asset?.collectionChainShortName
        ? getChain(asset?.collectionChainShortName).id
        : undefined,
    contractAddress: asset?.contractAddress,
    tokenId: asset?.assetTokenId,
    category: 'OFFER',
    isFillable: true,
    isExpired: false,
    isCancelled: false,
    sortBy: [
      ['perPrice', 'DESC'],
      ['endTime', 'ASC'],
    ],
    limit: 10,
    page: 1,
  };

  const itemsQuery = useItemsQuery<
    typeof apiClient.orders.getOrders,
    LootexOrder,
    'orders'
  >({
    queryKey: ['offers', params],
    queryFn: apiClient.orders.getOrders,
    itemsKey: 'orders',
    params,
    enabled: !!asset,
  });

  return itemsQuery;
};
