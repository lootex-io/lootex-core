'use client';

import { AddressCell, ItemCell, PriceCell } from '@/components/data-cells';
import { useModal } from '@/components/modal-manager';
import { Button } from '@/components/ui/button';
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
      size="sm"
    />
  );
};

export const columns: ColumnDef<LootexOrder>[] = [
  {
    header: 'Type',
    cell: ({ row }) => {
      return (
        <span className="text-sm font-bold capitalize">
          {row.original.offerType === 'Collection' &&
          row.original.category === 'offer'
            ? 'Collection offer'
            : 'Offer'}
        </span>
      );
    },
  },
  {
    accessorKey: 'name',
    header: 'Item',
    cell: ({ row }) => {
      const { onOpen: openAssetModal } = useModal('asset');
      const isCollectionOffer = row.original.offerType === 'Collection';

      const itemImageUrl = isCollectionOffer
        ? row.original.collections?.[0].logoImageUrl
        : row.original.assets?.[0].assetImageUrl;

      const itemTitle = isCollectionOffer
        ? row.original.collections?.[0].name
        : `#${row.original.assets?.[0].assetTokenId}`;
      const itemSubtitle = !isCollectionOffer
        ? row.original.assets?.[0].collectionName
        : undefined;

      return (
        <ItemCell
          imageUrl={itemImageUrl ?? undefined}
          title={itemTitle}
          subtitle={itemSubtitle}
          className="cursor-pointer"
          onClick={() => openAssetModal({ asset: row.original.assets?.[0] })}
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
      return <CustomPriceCell order={row.original} />;
    },
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity',
    cell: ({ row }) => {
      const totalAmount = Number(
        row.original.seaportOrder?.parameters?.consideration[0].startAmount ??
          '0',
      );
      const availableAmount = Number(
        row.original.seaportOrder?.parameters?.consideration[0]
          .availableAmount ?? '0',
      );

      if (totalAmount === 0) return '--';

      return `${totalAmount - availableAmount} / ${totalAmount}`;
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
  {
    id: 'actions',
    header: 'Action',
    cell: ({ row }) => {
      const { address } = useConnection();
      const account = address ? { address } : undefined;
      const { onOpen: onOpenCancelOfferModal } = useModal('cancelListing');

      const isOfferer = Boolean(
        account &&
          account?.address?.toLowerCase() ===
            row.original.offerer?.toLowerCase(),
      );

      if (isOfferer) {
        return (
          <Button
            onClick={() =>
              onOpenCancelOfferModal({
                category: 'offer',
                orders: [row.original],
              })
            }
            variant="secondary"
            size="sm"
          >
            Cancel Offer
          </Button>
        );
      }

      return null;
    },
  },
];
