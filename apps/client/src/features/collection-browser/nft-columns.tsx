'use client';

import { ItemCell, PriceCell } from '@/components/data-cells';
import { useModal } from '@/components/modal-manager';
import { Checkbox } from '@/components/ui/checkbox';
import { formatRelativeTime } from '@/utils/format';
import type { ColumnDef } from '@tanstack/react-table';
import type { Asset } from '@lootex-core/sdk/asset';
import { PurchaseButton } from '../purchase/purchase-button';
import { SellButton } from '../sell/sell-button';
import { useSelectionStore } from './selection-store';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.

const maxSelected = 20;

export const columns: ColumnDef<
  Asset & { isOwner?: boolean; showCollectionName?: boolean }
>[] = [
  {
    id: 'select',
    size: 10,
    header: ({ table }) => {
      const { selectedItems, setSelectedItems } = useSelectionStore();
      const selectableRows = table
        .getRowModel()
        .rows.filter(
          (row) => row.original.isOwner || row.original.order?.listing,
        );
      const visibleSelectableRows = selectableRows.slice(0, maxSelected);

      const allVisibleSelected =
        visibleSelectableRows.length > 0 &&
        visibleSelectableRows.every((row) =>
          selectedItems.some((item) => item.assetId === row.original.assetId),
        );

      return (
        <Checkbox
          checked={allVisibleSelected}
          onCheckedChange={(value) => {
            if (value) {
              setSelectedItems(
                visibleSelectableRows.map((row) => row.original),
              );
            } else {
              setSelectedItems([]);
            }
          }}
          aria-label="Select all visible rows"
          className="rounded"
        />
      );
    },
    cell: ({ row, table }) => {
      const isOwner = row.original.isOwner;
      const { selectedItems, toggleItem, selectItem, removeItem } =
        useSelectionStore();

      const isSelected = selectedItems.some(
        (item) => item.assetId === row.original.assetId,
      );

      return (
        <Checkbox
          checked={isSelected}
          onCheckedChange={(value) => {
            toggleItem(row.original);
          }}
          aria-label="Select row"
          className="rounded"
          disabled={
            (!isOwner && !row.original.order?.listing) ||
            (!isSelected && selectedItems.length >= maxSelected)
          }
        />
      );
    },
  },
  {
    accessorKey: 'name',
    header: 'Item',
    size: 100,
    cell: ({ row }) => {
      const { onOpen: openAssetModal } = useModal('asset');

      const collectionSlug = row.original.collectionSlug;

      const itemTitle = `#${row.original.assetTokenId}`;
      const itemSubtitle = row.original.collectionName;

      const handleOpenAssetModal = () => {
        openAssetModal({
          assetId: undefined,
          asset: row.original,
          collectionSlug,
        });
      };
      return (
        <ItemCell
          imageUrl={row.original.assetImageUrl}
          title={itemTitle}
          subtitle={row.original.showCollectionName ? itemSubtitle : undefined}
          className="cursor-pointer"
          onClick={handleOpenAssetModal}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleOpenAssetModal();
            }
          }}
        />
      );
    },
  },
  {
    accessorFn: (row) => row.order?.listing?.price.toString(),
    header: 'Price',
    size: 100,
    cell: ({ row }) => {
      return row.original.order?.listing?.hash ? (
        (row.original.isOwner && (
          <PriceCell
            price={row.original.order?.listing?.price.toString() ?? ''}
            symbol={row.original.order?.listing?.priceSymbol ?? ''}
          />
        )) || (
          <PurchaseButton
            orderHash={row.original.order?.listing?.hash}
            price={row.original.order?.listing?.price.toString() ?? ''}
            priceSymbol={row.original.order?.listing?.priceSymbol ?? ''}
          />
        )
      ) : (
        <span className="text-muted-foreground">--</span>
      );
    },
  },
  {
    accessorFn: (row) => row.order?.listing?.endTime,
    header: 'Expire',
    size: 60,
    cell: ({ row }) => {
      return (
        <span className="whitespace-nowrap text-muted-foreground text-sm">
          {row.original.order?.listing?.endTime
            ? formatRelativeTime(
                row.original.order?.listing?.endTime as unknown as Date,
              )
            : '--'}
        </span>
      );
    },
  },
  {
    id: 'action',
    header: 'Action',
    size: 50,
    cell: ({ row }) => {
      return row.original.isOwner ? <SellButton asset={row.original} /> : null;
    },
  },
];
