'use client';

import { AddressCell, PriceCell } from '@/components/data-cells';
import { useModal } from '@/components/modal-manager';
import { Button } from '@/components/ui/button';
import { AcceptOfferButton } from '@/features/accept-offer/accept-offer-button';
import { formatRelativeTime } from '@/utils/format';
import type { ColumnDef } from '@tanstack/react-table';
import type { Asset } from '@lootex-core/sdk/asset';
import type { LootexOrder } from '@lootex-core/sdk/order';
import { useConnection } from 'wagmi';

export const getColumns = ({
  isErc1155,
}: {
  isErc1155: boolean;
}): ColumnDef<LootexOrder & { offerAsset?: Asset; isOwner?: boolean }>[] => {
  return [
    {
      accessorKey: 'perPrice',
      header: 'Unit Price',
      cell: ({ row }) => (
        <PriceCell
          price={row.original.perPrice?.toString() ?? ''}
          symbol={row.original.priceSymbol}
        />
      ),
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

        // check is owner
        if (row.original.isOwner) {
          return (
            <AcceptOfferButton
              orderHash={row.original.hash}
              size="sm"
              asset={row.original.assets?.[0] ?? row.original.offerAsset}
            />
          );
        }

        return null;
      },
    },
  ];
};
