'use client';

import { DataTable } from '@/components/data-table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import env from '@/lib/env';
import { apiClient } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { useItemsQuery } from '@/lib/use-items-query';
import { cn } from '@/lib/utils';
import type { Asset } from '@lootex-core/sdk/asset';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import type { LootexOrder } from '@lootex-core/sdk/order';
import { useState } from 'react';
import { columns } from './columns';
import { columns as receivedCollectionColumns } from './received/collection-offer-columns';
import { columns as receivedColumns } from './received/columns';

export const Offers = ({
  collection,
  className,
  accountAddress,
}: {
  collection?: LootexCollection;
  accountAddress?: string;
  className?: string;
}) => {
  const params = {
    chainId: defaultChain.id,
    contractAddress: collection?.contractAddress,
    offerer: accountAddress,
    category: 'OFFER',
    isFillable: true,
    isExpired: false,
    isCancelled: false,
    sortBy: [
      ['price', 'DESC'],
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
    queryKey: ['offers-made', params],
    queryFn: apiClient.orders.getOrders,
    itemsKey: 'orders',
    params,
  });

  const [selectedOfferType, setSelectedOfferType] = useState<
    'offer' | 'collection_offer'
  >(env.receivedCollectionOffersEnabled ? 'collection_offer' : 'offer');

  const receivedAssetOffersParams = {
    chainId: defaultChain.id,
    walletAddress: accountAddress,
    orderStatus: [selectedOfferType],
    limit: 10,
    page: 1,
    isCount: true,
  };

  const receivedQuery = useItemsQuery<
    typeof apiClient.explore.assets,
    Asset,
    'items'
  >({
    queryKey: ['offers-received', receivedAssetOffersParams],
    queryFn: apiClient.explore.assets,
    itemsKey: 'items',
    params: receivedAssetOffersParams,
  });

  return (
    <div
      className={cn('flex flex-col gap-3 rounded-2xl bg-white p-3', className)}
    >
      <Tabs defaultValue="made" className="h-full flex flex-col gap-2">
        <TabsList className="self-start">
          <TabsTrigger value="made">Offers Made</TabsTrigger>
          <TabsTrigger value="received">Offers Received</TabsTrigger>
        </TabsList>
        <div className="flex-1 min-h-0">
          <TabsContent value="made" className="h-full mt-0">
            <DataTable
              columns={columns}
              data={itemsQuery.items ?? []}
              isLoading={itemsQuery.isLoading}
              skeletonClassName="my-2"
              infiniteScrollProps={{
                hasNextPage: itemsQuery.hasNextPage,
                isFetching: itemsQuery.isFetching,
                fetchNextPage: itemsQuery.fetchNextPage,
                threshold: 0,
              }}
            />
          </TabsContent>
          <TabsContent value="received" className="h-full mt-0 flex flex-col">
            {env.receivedCollectionOffersEnabled && (
              <Select
                value={selectedOfferType}
                onValueChange={(value) =>
                  setSelectedOfferType(value as 'offer' | 'collection_offer')
                }
              >
                <SelectTrigger className="self-start w-auto mb-1">
                  <SelectValue placeholder="Select an offer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collection_offer">
                    Collection Offer
                  </SelectItem>
                  <SelectItem value="offer">Direct Offer</SelectItem>
                </SelectContent>
              </Select>
            )}
            <DataTable
              columns={
                selectedOfferType === 'collection_offer'
                  ? receivedCollectionColumns
                  : receivedColumns
              }
              data={receivedQuery.items ?? []}
              className="flex-1 min-h-0"
              isLoading={receivedQuery.isLoading}
              skeletonClassName="my-2"
              infiniteScrollProps={{
                hasNextPage: receivedQuery.hasNextPage,
                isFetching: receivedQuery.isFetching,
                fetchNextPage: receivedQuery.fetchNextPage,
                threshold: 0,
              }}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
