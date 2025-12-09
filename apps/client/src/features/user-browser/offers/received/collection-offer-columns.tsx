'use client';

import { AddressCell, ItemCell, PriceCell } from '@/components/data-cells';
import { Image } from '@/components/image';
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
          onClick={() => openAssetModal({ asset: row.original })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              openAssetModal({ asset: row.original });
            }
          }}
          className="cursor-pointer"
        />
      );
    },
  },
  {
    accessorKey: 'perPrice',
    header: 'Unit Price',
    cell: ({ row }) => {
      if (!row.original.order?.collectionOffer) return '--';

      return (
        <PriceCell
          price={row.original.order.collectionOffer.perPrice.toString()}
          symbol={row.original.order.collectionOffer.priceSymbol}
        />
      );
    },
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => {
      const totalAmount = Number(
        // @ts-ignore
        row.original.order?.collectionOffer?.startAmount ?? '0',
      );
      const availableAmount = Number(
        // @ts-ignore
        row.original.order?.collectionOffer?.availableAmount ?? '0',
      );

      if (totalAmount === 0) return '--';

      return `${totalAmount - availableAmount} / ${totalAmount}`;
    },
  },
  {
    accessorKey: 'from',
    header: 'From',
    cell: ({ row }) => {
      if (!row.original.order?.collectionOffer) return '--';
      return (
        <AddressCell address={row.original.order.collectionOffer.offerer} />
      );
    },
  },
  {
    accessorKey: 'endTime',
    header: 'Expires',
    cell: ({ row }) => {
      if (!row.original.order?.collectionOffer) return '--';

      return (
        <span className="text-sm whitespace-nowrap">
          {/* @ts-ignore */}
          {formatRelativeTime(row.original.order.collectionOffer.endTime)}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: 'Action',
    cell: ({ row }) => {
      if (!row.original.order?.collectionOffer) return '--';
      return (
        <AcceptOfferButton
          orderHash={row.original.order.collectionOffer.hash}
          size="sm"
          asset={row.original}
        />
      );
    },
  },
];
