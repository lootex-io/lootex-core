import { PriceCell } from '@/components/data-cells';
import { DataTable } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { useItemsQuery } from '@/lib/use-items-query';
import type { RowSelectionState } from '@tanstack/react-table';
import type { Asset } from '@lootex-core/sdk/asset';
import type { LootexOrder } from '@lootex-core/sdk/order';
import { useMemo, useState } from 'react';
import { useConnection } from 'wagmi';
import { columns } from './columns';

export const SelectItemsStep = ({
  order,
  onSubmit,
}: {
  order?: LootexOrder;
  onSubmit: (assets: Asset[]) => void;
}) => {
  const { address } = useConnection();
  const account = address ? { address } : undefined;
  const collection = order?.collections?.[0];
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const handleSelectAsset = () => {
    const selectedIds = Object.keys(rowSelection);
    const selectedItems = itemsQuery.items?.filter((item, index) =>
      selectedIds.includes(index.toString()),
    );
    onSubmit(selectedItems ?? []);
  };

  const params = {
    isCount: true,
    sortBy: 'bestListPrice',
    chainId: collection?.chainId ?? defaultChain.id,
    collectionSlugs: [collection?.slug ?? ''],
    limit: 10,
    page: 1,
    walletAddress: account?.address,
  };

  const itemsQuery = useItemsQuery<
    typeof apiClient.explore.assets,
    Asset,
    'items'
  >({
    queryKey: ['instant-sell-items', params],
    queryFn: apiClient.explore.assets,
    itemsKey: 'items',
    params,
  });

  const maxSelection = useMemo(() => {
    if (!order) {
      return 0;
    }

    return Math.min(
      Number(order.seaportOrder.parameters.consideration[0].availableAmount),
      10,
    );
  }, [order]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Select Items to Sell</DialogTitle>
        <DialogDescription>
          Select up to <span className="font-bold">{maxSelection}</span> items
          to sell instantly, each for{' '}
          <PriceCell
            price={order?.perPrice.toString() ?? ''}
            symbol={order?.priceSymbol ?? ''}
            exact
            className="inline"
          />
          .
        </DialogDescription>
      </DialogHeader>
      <div className="max-h-[400px] rounded-md bg-white p-2">
        <DataTable
          columns={[
            ...columns,
            {
              header: 'Price',
              cell: ({ row }) => {
                return order ? (
                  <PriceCell
                    price={order?.perPrice.toString() ?? ''}
                    symbol={order?.priceSymbol ?? ''}
                    exact
                  />
                ) : (
                  '--'
                );
              },
            },
          ]}
          data={
            itemsQuery.items?.map((item) => ({
              ...item,
              maxSelected: maxSelection,
            })) ?? []
          }
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
          infiniteScrollProps={{
            hasNextPage: itemsQuery.hasNextPage,
            isFetching: itemsQuery.isFetching,
            fetchNextPage: itemsQuery.fetchNextPage,
            threshold: 0,
          }}
        />
      </div>
      <DialogFooter>
        <Button
          className="font-brand"
          disabled={Object.keys(rowSelection).length === 0}
          onClick={handleSelectAsset}
        >
          Sell {Object.keys(rowSelection).length} items
        </Button>
      </DialogFooter>
    </>
  );
};
