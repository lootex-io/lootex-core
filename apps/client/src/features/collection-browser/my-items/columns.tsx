'use client';

import { ItemCell, PriceCell } from '@/components/data-cells';
import { useModal } from '@/components/modal-manager';
import { Checkbox } from '@/components/ui/checkbox';
import { SellButton } from '@/features/sell/sell-button';
import type { ColumnDef } from '@tanstack/react-table';
import type { Asset } from '@/sdk/exports/asset';

const maxSelected = 20;

export const columns: ColumnDef<Asset>[] = [
  {
    id: 'select',
    size: 10,
    header: ({ table }) => {
      const selectedCount = table.getSelectedRowModel().rows.length;
      const visibleRows = table.getRowModel().rows.slice(0, maxSelected);
      const allVisibleSelected =
        visibleRows.length > 0 &&
        visibleRows.every((row) => row.getIsSelected());
      const someVisibleSelected = visibleRows.some((row) =>
        row.getIsSelected(),
      );

      return (
        <Checkbox
          checked={allVisibleSelected}
          onCheckedChange={(value) => {
            for (const row of visibleRows) {
              if (
                value &&
                selectedCount >= maxSelected &&
                !row.getIsSelected()
              ) {
                return;
              }
              row.toggleSelected(!!value);
            }
          }}
          aria-label="Select all visible rows"
          className="rounded"
        />
      );
    },
    cell: ({ row, table }) => {
      const selectedCount = table.getSelectedRowModel().rows.length;

      return (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            if (value && selectedCount >= maxSelected && !row.getIsSelected()) {
              return; // Prevent selecting more than maxSelected items
            }
            row.toggleSelected(!!value);
          }}
          aria-label="Select row"
          className="rounded"
          disabled={!row.getIsSelected() && selectedCount >= maxSelected}
        />
      );
    },
  },
  {
    accessorKey: 'name',
    header: 'Item',
    cell: ({ row }) => {
      const { onOpen: openAssetModal } = useModal('asset');
      return (
        <ItemCell
          imageUrl={row.original.assetImageUrl}
          title={`#${row.original.assetTokenId}`}
          className="cursor-pointer"
          onClick={() => openAssetModal({ asset: row.original })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              openAssetModal({ asset: row.original });
            }
          }}
        />
      );
    },
  },
  {
    accessorFn: (row) => row.order?.listing?.price,
    header: 'Price',
    cell: ({ row }) => {
      return row.original.order?.listing?.price ? (
        <PriceCell
          price={row.original.order?.listing?.price?.toString() ?? ''}
          symbol={row.original.order?.listing?.priceSymbol}
        />
      ) : (
        '--'
      );
    },
  },
  {
    header: 'Action',
    cell: ({ row }) => {
      return <SellButton asset={row.original} />;
    },
  },
];
