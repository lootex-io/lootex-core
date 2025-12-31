'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  type ColumnDef,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import InfiniteScroll from './ui/infinte-scroll';

export function DataTable<TData, TValue>({
  columns,
  data,
  className,
  children,
  isLoading,
  skeletonRows = 5,
  skeletonClassName,
  fixedFirstColumn = false,
  noResultsText = 'No results',
  rowSelection,
  setRowSelection,
  infiniteScrollProps,
  cellClassName,
  rowClassName,
  onRowClick,
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  className?: string;
  children?: ReactNode;
  skeletonRows?: number;
  skeletonClassName?: string;
  fixedFirstColumn?: boolean;
  noResultsText?: string;
  rowSelection?: RowSelectionState;
  setRowSelection?: Dispatch<SetStateAction<RowSelectionState>>;
  infiniteScrollProps?: {
    hasNextPage: boolean;
    isFetching: boolean;
    fetchNextPage: () => void;
    threshold: number;
  };
  cellClassName?: string;
  rowClassName?: string;
  onRowClick?: (row: TData, event: React.MouseEvent) => void;
}) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(rowSelection && setRowSelection
      ? {
          onRowSelectionChange: setRowSelection,
          state: {
            rowSelection,
          },
        }
      : {}),
  });

  return (
    <Table className={cn(className)}>
      <TableHeader
        className={cn('sticky top-0 z-10 shadow-sm bg-white', cellClassName)}
      >
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header, index) => {
              return (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className={cn(
                    fixedFirstColumn && index === 0 ? 'sticky left-0 z-20' : '',
                    'bg-white',
                    cellClassName,
                  )}
                >
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
        {isLoading ? (
          // Skeleton rows
          Array.from({ length: skeletonRows }).map((_, rowIndex) => (
            <TableRow
              key={`skeleton-${
                // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                rowIndex
              }`}
            >
              {columns.map((column, cellIndex) => (
                <TableCell
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  key={`skeleton-cell-${cellIndex}`}
                  style={{ width: column.size }}
                  className="transition-colors text-sm md:text-base"
                >
                  <Skeleton className={cn('h-5 w-full', skeletonClassName)} />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && 'selected'}
              className={cn('group', rowClassName)}
              onClick={(event) => onRowClick?.(row.original, event)}
            >
              {row.getVisibleCells().map((cell, index) => (
                <TableCell
                  key={cell.id}
                  style={{ width: cell.column.getSize() }}
                  className={cn(
                    fixedFirstColumn && index === 0
                      ? 'sticky left-0 bg-white group-hover:bg-muted z-1'
                      : '',
                    'transition-colors text-sm md:text-base',
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center">
              {noResultsText}
            </TableCell>
          </TableRow>
        )}
        {infiniteScrollProps && (
          <InfiniteScroll
            hasMore={infiniteScrollProps.hasNextPage}
            isLoading={infiniteScrollProps.isFetching}
            next={infiniteScrollProps.fetchNextPage}
            threshold={0}
          >
            {infiniteScrollProps?.hasNextPage && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <Loader2 className="my-4 h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            )}
          </InfiniteScroll>
        )}
      </TableBody>
    </Table>
  );
}
