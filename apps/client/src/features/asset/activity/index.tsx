'use client';

import { DataTable } from '@/components/data-table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/lootex';
import { useItemsQuery } from '@/lib/use-items-query';
import { cn } from '@/lib/utils';
import type { OrderHistory } from '@lootex-core/sdk/api/endpoints/order';
import { isErc1155Asset } from '@lootex-core/sdk/asset';
import type { Asset } from '@lootex-core/sdk/asset';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import { useState } from 'react';
import { columns } from './columns';

export const Activity = ({
  collection,
  asset,
  className,
}: {
  collection: LootexCollection;
  asset?: Asset;
  className?: string;
}) => {
  const isErc1155 = isErc1155Asset(asset);
  const [category, setCategory] = useState<'all' | 'sales' | 'list' | 'offer'>(
    'all',
  );

  const params = {
    contractAddress: collection.contractAddress,
    tokenId: asset?.assetTokenId,
    chainId: collection.chainId,
    ...(category !== 'all' ? { category: [category] } : {}),
    limit: 10,
    page: 1,
  };

  const itemsQuery = useItemsQuery<
    typeof apiClient.orders.getOrdersHistory,
    OrderHistory,
    'ordersHistory'
  >({
    queryKey: ['activity', params],
    queryFn: apiClient.orders.getOrdersHistory,
    itemsKey: 'ordersHistory',
    params,
  });

  return (
    <div
      className={cn('flex flex-col gap-3 rounded-2xl bg-white p-3', className)}
    >
      <Tabs
        defaultValue="all"
        value={category}
        onValueChange={(value) =>
          setCategory(value as 'all' | 'sales' | 'list' | 'offer')
        }
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="sale">Sales</TabsTrigger>
          <TabsTrigger value="list">Listings</TabsTrigger>
          <TabsTrigger value="offer">Offers</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable
        columns={
          isErc1155 ? columns : columns.filter((c) => c.id !== 'quantity')
        }
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
