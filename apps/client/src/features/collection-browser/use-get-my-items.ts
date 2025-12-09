import { apiClient } from '@/lib/lootex';
import { useItemsQuery } from '@/lib/use-items-query';
import type { Asset } from 'lootex/asset';

export const useGetMyItems = ({
  chainId,
  collectionSlug,
  walletAddress,
}: {
  chainId: number;
  collectionSlug?: string;
  walletAddress?: string;
}) => {
  const params = {
    isCount: true,
    sortBy: 'bestListPrice',
    chainId,
    collectionSlugs: [collectionSlug],
    limit: 20,
    page: 1,
    walletAddress,
  };

  const itemsQuery = useItemsQuery<
    typeof apiClient.explore.assets,
    Asset,
    'items'
  >({
    queryKey: ['my-items', params],
    queryFn: apiClient.explore.assets,
    itemsKey: 'items',
    params,
    enabled: !!walletAddress && !!collectionSlug,
  });

  return itemsQuery;
};
