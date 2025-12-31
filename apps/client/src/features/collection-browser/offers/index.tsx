'use client';

import { PriceCell } from '@/components/data-cells';
import { DataTable } from '@/components/data-table';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { useItemsQuery } from '@/lib/use-items-query';
import { cn } from '@/lib/utils';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import type { LootexOrder } from '@lootex-core/sdk/order';
import { ChartBarBigIcon, ListIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useConnection } from 'wagmi';
import { columns } from './columns';

export const Offers = ({
  collection,
  className,
}: {
  collection?: LootexCollection;
  className?: string;
}) => {
  const [viewMode, setViewMode] = useState<'all-offers' | 'grouped-offers'>(
    'all-offers'
  );
  const [showMyOffers, setShowMyOffers] = useState(false);
  const { address } = useConnection();
  const account = address ? { address } : undefined;

  const params = {
    chainId: defaultChain.id,
    contractAddress: collection?.contractAddress,
    category: 'OFFER',
    offerType: 'Collection',
    isFillable: true,
    isExpired: false,
    isCancelled: false,
    sortBy: [
      ['perPrice', 'DESC'],
      ['endTime', 'ASC'],
    ],
    limit: 20,
    page: 1,
    ...(showMyOffers && account && { offerer: account.address }),
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
  });
  const aggregatedOrders = useMemo(() => {
    return Object.entries(
      itemsQuery.items?.reduce(
        (acc, order) => {
          const availableAmount = Number(
            order.seaportOrder.parameters.consideration[0].availableAmount
          );
          const price = Number(order.perPrice);
          const symbol = order.priceSymbol;

          const key = `${price}-${symbol}`;
          const currentEntry = acc[key] ?? {
            price,
            symbol,
            quantity: 0,
            usersCount: 0,
          };

          acc[key] = {
            price,
            symbol,
            quantity: currentEntry.quantity + availableAmount,
            usersCount: currentEntry.usersCount + 1,
          };

          return acc;
        },
        {} as Record<
          string,
          {
            price: number;
            symbol: string;
            quantity: number;
            usersCount: number;
          }
        >
      ) ?? {}
    ).map(([_, { price, symbol, quantity, usersCount }]) => ({
      price: Number(price),
      symbol,
      quantity,
      usersCount,
      totalValue: quantity * Number(price),
    }));
  }, [itemsQuery.items]);

  const maxQuantity = useMemo(() => {
    return Math.max(...aggregatedOrders.map((order) => order.quantity));
  }, [aggregatedOrders]);

  return (
    <div
      className={cn('flex flex-col gap-2 rounded-2xl bg-white p-3', className)}
    >
      <div className="flex items-center gap-2">
        <Tabs
          value={viewMode}
          onValueChange={(value) =>
            setViewMode(value as 'all-offers' | 'grouped-offers')
          }
        >
          <TabsList>
            <TabsTrigger value="all-offers">
              <ListIcon size={16} />
            </TabsTrigger>
            <TabsTrigger value="grouped-offers">
              <ChartBarBigIcon size={16} />
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {account && (
          <div className="flex items-center gap-2">
            <Switch checked={showMyOffers} onCheckedChange={setShowMyOffers} />
            <span className="text-sm">My Offers</span>
          </div>
        )}
      </div>
      {viewMode === 'all-offers' ? (
        <DataTable
          columns={columns}
          data={itemsQuery.items ?? []}
          className="flex-1 min-h-0"
          isLoading={itemsQuery.isLoading}
          skeletonRows={10}
          infiniteScrollProps={{
            hasNextPage: itemsQuery.hasNextPage,
            isFetching: itemsQuery.isFetching,
            fetchNextPage: itemsQuery.fetchNextPage,
            threshold: 0,
          }}
        />
      ) : (
        <DataTable
          columns={[
            {
              header: 'Offer Price',
              cell: ({ row }) => (
                <div className="relative w-full h-9 flex items-center pl-1 my-[-2px]">
                  <div
                    className="absolute inset-0 bg-brand/20 "
                    style={{
                      width: `${(row.original.quantity / maxQuantity) * 100}%`,
                    }}
                  />
                  <div className="relative">
                    <PriceCell
                      price={row.original.price.toString()}
                      symbol={row.original.symbol}
                      exact
                    />
                  </div>
                </div>
              ),
            },
            {
              header: 'Quantity',
              cell: ({ row }) => row.original.quantity,
            },
            {
              header: 'Total Volume',
              cell: ({ row }) => (
                <PriceCell
                  price={row.original.totalValue.toString()}
                  symbol={row.original.symbol}
                  exact
                />
              ),
            },
            {
              header: 'Users',
              cell: ({ row }) => row.original.usersCount,
            },
          ]}
          data={aggregatedOrders}
          className="flex-1 min-h-0"
          isLoading={itemsQuery.isLoading}
          skeletonRows={10}
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
