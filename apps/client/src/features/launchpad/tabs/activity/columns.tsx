'use client';

import { AddressCell, NumberCell, PriceCell } from '@/components/data-cells';
import { ViewTransactionLink } from '@/components/view-transaction-link';
import type { ColumnDef } from '@tanstack/react-table';

import { formatRelativeTime } from '@/utils/format';

import { type History } from './';
import { tokens } from '@/lib/tokens';
import { formatUnits } from 'viem';

export const columns: ColumnDef<
  Pick<
    History,
    | 'address'
    | 'quantityClaimed'
    | 'mintPrice'
    | 'symbol'
    | 'txHash'
    | 'updatedAt'
  >
>[] = [
  {
    accessorKey: 'address',
    header: 'Address',
    cell: ({ row }) => {
      if (!row.original.address) return '--';
      return <AddressCell address={row.original.address} />;
    },
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => {
      if (!row.original.quantityClaimed) return '--';
      return (
        <NumberCell
          number={row.original.quantityClaimed.toString()}
          compact={false}
          className="font-normal"
        />
      );
    },
  },
  {
    accessorKey: 'mintPrice',
    header: 'Price',
    cell: ({ row }) => {
      if (!row.original.mintPrice) return '--';
      const token = tokens.find((t) => t.symbol === row.original.symbol);
      const price = formatUnits(
        BigInt(row.original.mintPrice),
        token?.decimals ?? 18,
      );
      return (
        <>
          {Number(row.original.mintPrice) > 0 ? (
            <PriceCell price={price} symbol={token?.symbol} />
          ) : (
            <p>Free</p>
          )}
        </>
      );
    },
  },
  {
    accessorKey: 'updatedAt',
    header: 'Date',
    cell: ({ row }) => {
      if (!row.original.updatedAt) return '--';
      return row.original.txHash ? (
        <ViewTransactionLink txHash={row.original.txHash}>
          {formatRelativeTime(row.original.updatedAt)}
        </ViewTransactionLink>
      ) : (
        <span className="whitespace-nowrap">
          {formatRelativeTime(row.original.updatedAt)}
        </span>
      );
    },
  },
];
