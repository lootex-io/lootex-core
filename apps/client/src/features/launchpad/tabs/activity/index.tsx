'use client';

import InfiniteScroll from '@/components/ui/infinte-scroll';
import { flexRender, getCoreRowModel } from '@tanstack/react-table';

import { useReactTable } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

import { columns } from './columns';
import { PaginatedParams } from 'lootex/api/endpoints/utils';
import { useItemsQuery } from '@/lib/use-items-query';
import { PaginatedResponse } from 'lootex/api/endpoints/utils';
import { apiClient } from '@/lib/lootex';
import { LootexCollection } from 'lootex/collection';

export type History = {
  id: string;
  address: string;
  quantityClaimed: number;
  mintType: string;
  mintPrice: string;
  txHash: `0x${string}`;
  symbol: string;
  contractAddress: `0x${string}`;
  txFee: string;
  createdAt: string;
  updatedAt: string;
};

type GetLaunchpadHistoryParams = PaginatedParams & {
  contractAddress: `0x${string}`;
};
type GetLaunchpadHistoryResponse = PaginatedResponse<History, 'items'>;

const Activity = ({ collection }: { collection: LootexCollection }) => {
  const queryFn = (params: GetLaunchpadHistoryParams) =>
    apiClient.request<GetLaunchpadHistoryResponse>({
      method: 'GET',
      path: '/v3/studio/contracts/mint',
      query: params,
    });

  const historyQuery = useItemsQuery<
    typeof queryFn,
    History,
    'items',
    GetLaunchpadHistoryParams
  >({
    queryKey: [
      'launchpad-history',
      { contractAddress: collection?.contractAddress },
    ],
    queryFn,
    itemsKey: 'items',
    params: {
      contractAddress: collection?.contractAddress,
    },
    enabled: !!collection?.contractAddress,
  });

  const data = useMemo(
    () => historyQuery.items,
    [JSON.stringify(historyQuery.items)],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="relative overflow-auto max-h-[420px] p-4 rounded-3xl bg-white">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {historyQuery.isLoading ? (
            [...Array(4)].map((_, index) => (
              <TableRow key={index}>
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex} colSpan={1}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No activity found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <InfiniteScroll
        hasMore={historyQuery.hasNextPage}
        isLoading={historyQuery.isFetching}
        next={historyQuery.fetchNextPage}
        threshold={0}
      >
        {historyQuery.hasNextPage && (
          <Loader2 className="my-4 h-6 w-6 animate-spin mx-auto" />
        )}
      </InfiniteScroll>
    </div>
  );
};

export default Activity;
