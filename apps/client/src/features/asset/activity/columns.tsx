'use client';

import { AddressCell, ItemCell, PriceCell } from '@/components/data-cells';
import { ViewTransactionLink } from '@/components/view-transaction-link';
import { formatRelativeTime } from '@/utils/format';
import type { ColumnDef } from '@tanstack/react-table';
import type { GetOrdersHistoryResponse } from '@lootex-core/sdk/api/endpoints/order';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type History = GetOrdersHistoryResponse['ordersHistory'][number];

export const columns: ColumnDef<History>[] = [
  {
    accessorKey: 'category',
    header: 'Type',
    cell: ({ row }) => {
      return (
        <div className="capitalize flex flex-col">
          <span className="text-sm font-bold">{row.original.category}</span>
          {row.original.orderStatus === 'Fulfilled' && (
            <span className="text-xs text-green-500">Sold</span>
          )}
          {row.original.orderStatus === 'Expired' && (
            <span className="text-xs text-red-500">Expired</span>
          )}
          {row.original.orderStatus === 'Canceled' && (
            <span className="text-xs text-red-500">Canceled</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'name',
    header: 'Item',
    cell: ({ row }) => {
      return (
        <ItemCell
          imageUrl={row.original.assetImageUrl}
          title={`#${row.original.tokenId}`}
        />
      );
    },
  },
  {
    accessorFn: (row) => row.perPrice,
    header: 'Price',
    cell: ({ row }) => {
      return (
        <PriceCell
          price={row.original.perPrice?.toString() ?? ''}
          symbol={row.original.currencySymbol}
        />
      );
    },
  },
  {
    id: 'quantity',
    accessorKey: 'amount',
    header: 'Quantity',
    cell: ({ row }) => {
      return <span className="text-sm">{row.original.amount}</span>;
    },
  },
  {
    accessorKey: 'from',
    header: 'From',
    cell: ({ row }) => {
      if (!row.original.fromAddress) return '--';
      return <AddressCell address={row.original.fromAddress} />;
    },
  },
  {
    accessorKey: 'to',
    header: 'To',
    cell: ({ row }) => {
      if (!row.original.toAddress) return '--';
      return <AddressCell address={row.original.toAddress} />;
    },
  },
  {
    accessorKey: 'updatedAt',
    header: 'Time',
    cell: ({ row }) => {
      if (!row.original.updatedAt) return '--';
      return row.original.txHash ? (
        <ViewTransactionLink txHash={row.original.txHash} className="text-sm">
          {formatRelativeTime(row.original.updatedAt)}
        </ViewTransactionLink>
      ) : (
        <span className="text-sm whitespace-nowrap">
          {formatRelativeTime(row.original.updatedAt)}
        </span>
      );
    },
  },
];
