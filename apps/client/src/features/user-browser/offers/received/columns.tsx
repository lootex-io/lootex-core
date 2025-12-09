'use client';

import { AddressCell, ItemCell, PriceCell } from '@/components/data-cells';
import { useModal } from '@/components/modal-manager';
import { AcceptOfferButton } from '@/features/accept-offer/accept-offer-button';
import { formatRelativeTime } from '@/utils/format';
import type { ColumnDef } from '@tanstack/react-table';
import type { Asset } from 'lootex/asset';

export const columns: ColumnDef<Asset>[] = [
  {
    accessorKey: 'name',
    header: 'Item',
    cell: ({ row }) => {
      const { onOpen: openAssetModal } = useModal('asset');

      const itemTitle = `#${row.original.assetTokenId}`;
      const itemSubtitle = row.original.collectionName;

      return (
        <ItemCell
          imageUrl={row.original.assetImageUrl}
          title={itemTitle}
          subtitle={itemSubtitle}
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
    accessorKey: 'perPrice',
    header: 'Unit Price',
    cell: ({ row }) => {
      if (!row.original.order?.offer) return '--';

      return (
        <PriceCell
          price={row.original.order.offer.perPrice.toString()}
          symbol={row.original.order.offer.priceSymbol}
        />
      );
    },
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => {
      // @ts-ignore
      const totalAmount = Number(row.original.order?.offer?.startAmount ?? '0');
      const availableAmount = Number(
        // @ts-ignore
        row.original.order?.offer?.availableAmount ?? '0',
      );

      if (totalAmount === 0) return '--';

      return `${totalAmount - availableAmount} / ${totalAmount}`;
    },
  },
  {
    accessorKey: 'from',
    header: 'From',
    cell: ({ row }) => {
      if (!row.original.order?.offer) return '--';
      return <AddressCell address={row.original.order.offer.offerer} />;
    },
  },
  {
    accessorKey: 'endTime',
    header: 'Expires',
    cell: ({ row }) => {
      if (!row.original.order?.offer?.endTime) return '--';

      return (
        <span className="text-sm whitespace-nowrap">
          {/* @ts-ignore */}
          {formatRelativeTime(row.original.order.offer.endTime)}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: 'Action',
    cell: ({ row }) => {
      if (!row.original.order?.offer) return '--';
      return (
        <AcceptOfferButton
          orderHash={row.original.order.offer.hash}
          size="sm"
          asset={row.original}
        />
      );
    },
  },
];
