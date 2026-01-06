'use client';

import { AddressCell, PriceCell } from '@/components/data-cells';
import { PurchaseButton } from '@/features/purchase/purchase-button';
import { formatRelativeTime } from '@/utils/format';
import type { ColumnDef } from '@tanstack/react-table';

import type { LootexOrder } from '@/sdk/exports/order';
import { useConnection } from 'wagmi';

const CustomPriceCell = ({ order }: { order?: LootexOrder }) => {
  const { address } = useConnection();
  const account = address ? { address } : undefined;

  const isOfferer = Boolean(
    account &&
      account?.address?.toLowerCase() === order?.offerer?.toLowerCase(),
  );

  if (!order) return '--';

  if (isOfferer) {
    return (
      <PriceCell
        price={order.perPrice?.toString() ?? ''}
        symbol={order.priceSymbol}
      />
    );
  }

  return (
    <PurchaseButton
      orderHash={order.hash}
      price={order.perPrice?.toString() ?? ''}
      priceSymbol={order.priceSymbol}
    />
  );
};

export const columns: ColumnDef<LootexOrder>[] = [
  {
    accessorKey: 'perPrice',
    header: 'Unit Price',
    cell: ({ row }) => {
      return <CustomPriceCell order={row.original} />;
    },
  },
  {
    accessorFn: (row) => {
      return row.seaportOrder?.parameters.offer[0].endAmount;
    },
    header: 'Quantity',
    cell: ({ row }) => {
      return (
        <div>{row.original.seaportOrder?.parameters.offer[0].endAmount}</div>
      );
    },
  },
  {
    accessorKey: 'from',
    header: 'From',
    cell: ({ row }) => {
      if (!row.original.offerer) return '--';
      return <AddressCell address={row.original.offerer} />;
    },
  },
  {
    accessorKey: 'endTime',
    header: 'Expire',
    cell: ({ row }) => {
      if (!row.original.endTime) return '--';

      return (
        <span className="text-sm whitespace-nowrap">
          {/* @ts-ignore */}
          {formatRelativeTime(row.original.endTime * 1000)}
        </span>
      );
    },
  },
];
