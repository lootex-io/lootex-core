'use client';

import { ItemCell } from '@/components/data-cells';
import { useModal } from '@/components/modal-manager';
import { Checkbox } from '@/components/ui/checkbox';
import type { ColumnDef } from '@tanstack/react-table';
import type { Asset } from '@/sdk/exports/asset';

export const columns: ColumnDef<Asset & { maxSelected: number }>[] = [
  {
    id: 'select',
    size: 10,
    header: ({ table }) => {
      const selectedCount = table.getSelectedRowModel().rows.length;
      const maxSelected = Math.min(
        ...table.getRowModel().rows.map((row) => row.original.maxSelected),
      );
      const allSelected = selectedCount === maxSelected;

      return (
        <Checkbox
          checked={allSelected}
          onCheckedChange={(value) => {
            if (value) {
              // Select rows up to maxSelected
              const rows = table.getRowModel().rows;
              for (let i = 0; i < rows.length && i < maxSelected; i++) {
                rows[i].toggleSelected(true);
              }
            } else {
              // Deselect all rows
              for (const row of table.getRowModel().rows) {
                row.toggleSelected(false);
              }
            }
          }}
          aria-label="Select all"
          className="rounded"
          disabled={selectedCount >= maxSelected && !allSelected}
        />
      );
    },
    cell: ({ row, table }) => {
      const selectedCount = table.getSelectedRowModel().rows.length;

      return (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            if (
              value &&
              selectedCount >= row.original.maxSelected &&
              !row.getIsSelected()
            ) {
              return; // Prevent selecting more than maxSelected items
            }
            row.toggleSelected(!!value);
          }}
          aria-label="Select row"
          className="rounded"
          disabled={
            !row.getIsSelected() && selectedCount >= row.original.maxSelected
          }
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
];
