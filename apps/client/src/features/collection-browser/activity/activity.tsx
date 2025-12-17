'use client';

import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import InfiniteScroll from '@/components/ui/infinte-scroll';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { useItemsQuery } from '@/lib/use-items-query';
import { cn } from '@/lib/utils';
import type { OrderHistory } from '@lootex-core/sdk/api/endpoints/order';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import { Loader2, MaximizeIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useUiStore } from '../browser-store';
import { columns } from './columns';
import { MiniActivityTable } from './mini-activity-table';

export const Activity = ({
  collection,
  accountAddress,
  className,
  isTab,
  onExpand,
  isOwner,
  isMiniTable = false,
}: {
  collection?: LootexCollection;
  accountAddress?: string;
  className?: string;
  isOwner?: boolean;
  isTab?: boolean;
  onExpand?: () => void;
  isMiniTable?: boolean;
}) => {
  const [category, setCategory] = useState<'all' | 'sales' | 'list' | 'offer'>(
    'all',
  );
  const { isActivityOpen, setIsActivityOpen } = useUiStore();

  const params = {
    contractAddress: collection?.contractAddress,
    chainId: collection?.chainId ?? defaultChain.id,
    userAddress: accountAddress,
    ...(category !== 'all'
      ? {
          category:
            category === 'offer' ? ['offer', 'collection_offer'] : [category],
        }
      : { category: ['sale', 'list', 'offer', 'collection_offer'] }),
    limit: 20,
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
    enabled: !!collection || !!accountAddress,
  });

  const items =
    itemsQuery.items?.map((item) => ({
      ...item,
      showCollectionName: !collection,
    })) ?? [];

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-2xl bg-white p-3 overflow-hidden',
        className,
      )}
    >
      {collection && !isTab && (
        <div className="hidden lg:flex justify-between items-center bg-white">
          <h3 className="font-bold font-brand text-lg">Activity</h3>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={onExpand}
              className="text-muted-foreground"
            >
              <MaximizeIcon size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsActivityOpen(false)}
              className="text-muted-foreground"
            >
              <XIcon size={16} />
            </Button>
          </div>
        </div>
      )}
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
      {isMiniTable ? (
        <MiniActivityTable
          data={items}
          className="flex-1 mx-[-12px] overflow-y-auto"
          isLoading={itemsQuery.isPending}
        >
          <InfiniteScroll
            hasMore={itemsQuery.hasNextPage}
            isLoading={itemsQuery.isFetching}
            next={itemsQuery.fetchNextPage}
            threshold={0}
          >
            {itemsQuery.hasNextPage && (
              <Loader2 className="my-4 h-6 w-6 animate-spin mx-auto flex-shrink-0" />
            )}
          </InfiniteScroll>
        </MiniActivityTable>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          className="flex-1 min-h-0"
          isLoading={itemsQuery.isLoading}
          skeletonRows={10}
          skeletonClassName="h-5 my-2"
          infiniteScrollProps={{
            hasNextPage: itemsQuery.hasNextPage,
            isFetching: itemsQuery.isFetching,
            fetchNextPage: itemsQuery.fetchNextPage,
            threshold: 0,
          }}
        />
      )}
    </div>
  );
};
