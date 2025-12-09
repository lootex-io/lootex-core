'use client';

import { DataTable } from '@/components/data-table';
import InfiniteScroll from '@/components/ui/infinte-scroll';
import { apiClient } from '@/lib/lootex';
import { useItemsQuery } from '@/lib/use-items-query';
import { cn } from '@/lib/utils';
import type { OwnerAccount } from 'lootex/account';
import { type Asset, isErc1155Asset } from 'lootex/asset';
import { getChain } from 'lootex/chains';
import type { LootexOrder } from 'lootex/order';
import { Loader2 } from 'lucide-react';
import { columns } from './columns';

export const Listings = ({
  asset,
  className,
  owner,
}: {
  asset: Asset;
  className?: string;
  owner?: OwnerAccount;
}) => {
  const isErc1155 = isErc1155Asset(asset);

  const params = {
    chainId:
      asset?.contractChainId || asset?.collectionChainShortName
        ? getChain(asset?.collectionChainShortName).id
        : undefined,
    contractAddress: asset.contractAddress,
    tokenId: asset.assetTokenId,
    category: 'LISTING',
    ...(!isErc1155 && {
      offerer: owner?.address,
    }),
    isFillable: true,
    isExpired: false,
    isCancelled: false,
    sortBy: [
      ['price', 'ASC'],
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
    queryKey: ['listings', params],
    queryFn: apiClient.orders.getOrders,
    itemsKey: 'orders',
    params,
  });

  return (
    <div
      className={cn('flex flex-col gap-3 rounded-2xl bg-white p-3', className)}
    >
      <DataTable
        columns={columns}
        data={itemsQuery.items ?? []}
        className="flex-1 min-h-0"
        isLoading={itemsQuery.isLoading}
        skeletonClassName="my-2"
        infiniteScrollProps={{
          hasNextPage: itemsQuery.hasNextPage,
          isFetching: itemsQuery.isFetching,
          fetchNextPage: itemsQuery.fetchNextPage,
          threshold: 0,
        }}
      />
    </div>
  );
};
