'use client';

import { DataTable } from '@/components/data-table';
import { useModal } from '@/components/modal-manager';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { RowSelectionState } from '@tanstack/react-table';
import type { LootexCollection } from '@/sdk/exports/collection';
import { MaximizeIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useUiStore } from '../browser-store';
import { useGetMyItems } from '../use-get-my-items';
import { columns } from './columns';

export const MyItems = ({
  collection,
  className,
  walletAddress,
  isTab,
  onExpand,
}: {
  collection: LootexCollection;
  className?: string;
  walletAddress?: string;
  onExpand?: () => void;
  isTab?: boolean;
}) => {
  const { setIsMyItemsOpen } = useUiStore();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const { onOpen: onOpenSellModal } = useModal('sell');

  const handleBatchSell = () => {
    onOpenSellModal({
      assets: Object.keys(rowSelection).map(
        (key) => itemsQuery.items?.[Number(key)],
      ),
    });
  };

  const itemsQuery = useGetMyItems({
    chainId: Number(collection.chainId),
    collectionSlug: collection.slug,
    walletAddress,
  });

  return (
    <div className={cn('flex flex-col rounded-2xl bg-white p-3', className)}>
      {!isTab && (
        <div className="hidden lg:flex justify-between items-center bg-white">
          <h3 className="font-bold font-brand text-lg">My Items</h3>
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
              onClick={() => setIsMyItemsOpen(false)}
              className="text-muted-foreground"
            >
              <XIcon size={16} />
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={itemsQuery.items ?? []}
        className="flex-1 min-h-0"
        rowSelection={rowSelection}
        setRowSelection={setRowSelection}
        isLoading={itemsQuery.isLoading}
        skeletonRows={10}
        skeletonClassName="h-5 my-2"
        noResultsText="You have no items in this collection yet."
        infiniteScrollProps={{
          hasNextPage: itemsQuery.hasNextPage,
          isFetching: itemsQuery.isFetching,
          fetchNextPage: itemsQuery.fetchNextPage,
          threshold: 0,
        }}
      />
      {Object.keys(rowSelection).length > 0 && (
        <div className="flex justify-end pt-2 border-t items-center gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setRowSelection({})}>
              Cancel
            </Button>
            <Button onClick={handleBatchSell}>
              List {Object.keys(rowSelection).length} items
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
