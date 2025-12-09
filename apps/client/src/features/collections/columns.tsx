'use client';

import {
  CollectionCell,
  NumberCell,
  PercentageCell,
  PriceCell,
  UsdCell,
} from '@/components/data-cells';
import IconPopover from '@/components/icon-popover';

import type { ColumnDef } from '@tanstack/react-table';
import type { GetCollectionTradingBoardResponse } from 'lootex/api/endpoints/collection';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Collection =
  GetCollectionTradingBoardResponse['tradingBoard'][number];

export const columns: ColumnDef<Collection>[] = [
  {
    accessorKey: 'name',
    header: 'Collection',
    cell: ({ row }) => {
      return <CollectionCell collection={row.original} />;
    },
  },
  {
    id: 'floor',
    accessorFn: (row) => row.bestListing?.perPrice,
    header: () => <div className="text-right">Floor</div>,
    cell: ({ row }) => {
      return (
        <div className="text-right">
          {!row.original.bestListing?.perPrice ? (
            '--'
          ) : (
            <PriceCell
              price={row.original.bestListing?.perPrice?.toString() ?? ''}
              symbol={row.original.symbol}
              decimals={4}
              threshold={0.0001}
            />
          )}
        </div>
      );
    },
  },
  {
    id: 'best-offer',
    // @ts-ignore
    accessorFn: (row) => row.bestCollectionOffer?.bestSeaportOrder?.perPrice,
    header: () => <div className="text-right">Best Offer</div>,
    cell: ({ row }) => {
      return (
        <div className="text-right">
          {!row.original.bestCollectionOffer?.hasBestCollectionOrder ||
          // @ts-ignore
          !row.original.bestCollectionOffer?.bestSeaportOrder?.perPrice ? (
            '--'
          ) : (
            <PriceCell
              price={
                // @ts-ignore
                row.original.bestCollectionOffer?.bestSeaportOrder?.perPrice?.toString() ??
                ''
              }
              symbol={row.original.bestCollectionOffer.priceSymbol ?? ''}
              decimals={4}
              threshold={0.0001}
            />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'tradingVolume',
    header: () => (
      <div className="flex items-center justify-end">
        <p>Volume</p>
        <IconPopover>Data updates every hour</IconPopover>
      </div>
    ),
    cell: ({ row }) => {
      return (
        <div className="text-right">
          {!row.original.tradingVolume || row.original.tradingVolume === '0' ? (
            '--'
          ) : (
            <UsdCell number={row.getValue('tradingVolume')} />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'floorPriceChangePercent',
    header: () => (
      <div className="flex items-center justify-end">
        <p className="whitespace-nowrap">Floor Change</p>
        <IconPopover>Data updates every hour</IconPopover>
      </div>
    ),
    cell: ({ row }) => {
      return (
        <div className="text-right">
          <PercentageCell
            percentage={row.getValue('floorPriceChangePercent')}
            colorful
          />
        </div>
      );
    },
  },
  {
    accessorKey: 'volumeChangePercent',
    header: () => (
      <div className="flex items-center justify-end">
        <p className="whitespace-nowrap">Volume Change</p>
        <IconPopover>Data updates every hour</IconPopover>
      </div>
    ),
    cell: ({ row }) => {
      return (
        <div className="text-right">
          <PercentageCell
            percentage={row.getValue('volumeChangePercent')}
            colorful
          />
        </div>
      );
    },
  },
  {
    accessorKey: 'tradingCount',
    header: () => <div className="text-right">Sales</div>,
    cell: ({ row }) => {
      return (
        <div className="text-right">
          {!row.original.tradingCount || row.original.tradingCount === '0' ? (
            '--'
          ) : (
            <NumberCell number={row.getValue('tradingCount')} />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'totalOwners',
    header: () => <div className="text-right">Owners</div>,
    cell: ({ row }) => {
      return (
        <div className="text-right">
          {!row.original.totalOwners ? (
            '--'
          ) : (
            <NumberCell number={row.getValue('totalOwners')} />
          )}
        </div>
      );
    },
  },
];
