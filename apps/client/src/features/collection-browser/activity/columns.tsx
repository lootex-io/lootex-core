'use client';

import { AddressCell, ItemCell, PriceCell } from '@/components/data-cells';
import { useModal } from '@/components/modal-manager';
import { ViewTransactionLink } from '@/components/view-transaction-link';
import { formatRelativeTime } from '@/utils/format';
import type { ColumnDef } from '@tanstack/react-table';
import type { GetOrdersHistoryResponse } from '@lootex-core/sdk/api/endpoints/order';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type History = GetOrdersHistoryResponse['ordersHistory'][number];

export const columns: ColumnDef<History & { showCollectionName: boolean }>[] = [
  {
    accessorKey: 'category',
    header: 'Type',
    size: 40,
    cell: ({ row }) => {
      return (
        <div className="capitalize flex flex-col text-sm">
          <span className="font-bold">
            {row.original.category === 'collection_offer' ? (
              <>
                Collection
                <br />
                Offer
              </>
            ) : (
              row.original.category
            )}
          </span>
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
    size: 150,
    cell: ({ row }) => {
      const { onOpen: openAssetModal } = useModal('asset');

      const collectionSlug = row.original.collectionSlug;

      if (row.original.category === 'collection_offer') {
        return (
          <ItemCell
            imageUrl={row.original.collectionLogoImageUrl}
            title={row.original.collectionName}
          />
        );
      }

      const assetId = `${row.original.collectionChainShortName}/${row.original.contractAddress}/${row.original.tokenId}`;

      const handleOpenAssetModal = () => {
        openAssetModal({
          assetId,
          asset: undefined,
          collectionSlug,
        });
      };
      return (
        <ItemCell
          imageUrl={
            row.original.assetImageUrl ?? row.original.collectionLogoImageUrl
          }
          title={`#${row.original.tokenId}`}
          subtitle={
            row.original.showCollectionName
              ? row.original.collectionName
              : undefined
          }
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
    accessorFn: (row) => row.perPrice,
    header: 'Price',
    size: 100,
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
    accessorKey: 'amount',
    header: 'Quantity',
    cell: ({ row }) => {
      return <span className="text-sm">{row.original.amount}</span>;
    },
  },
  {
    accessorKey: 'from',
    header: 'From',
    size: 100,
    cell: ({ row }) => {
      if (!row.original.fromAddress) return '--';
      return <AddressCell address={row.original.fromAddress} />;
    },
  },
  {
    accessorKey: 'to',
    header: 'To',
    size: 100,
    cell: ({ row }) => {
      if (!row.original.toAddress) return '--';
      return <AddressCell address={row.original.toAddress} />;
    },
  },
  {
    accessorKey: 'updatedAt',
    header: 'Time',
    size: 100,
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
