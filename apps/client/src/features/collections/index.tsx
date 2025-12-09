'use client';

import { DataTable } from '@/components/data-table';
import { apiClient } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { useItemsQuery } from '@/lib/use-items-query';
import { cn } from '@/lib/utils';
import type {
  GetCollectionTradingBoardParams,
  GetCollectionTradingBoardResponse,
} from 'lootex/api/endpoints/collection';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { columns } from './columns';
import { TimeRangeTabs } from './time-range-tabs';

export default function Collections({
  className,
  hasLimit = false,
}: {
  className?: string;
  hasLimit?: boolean;
}) {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<
    'one_day' | 'one_week' | 'one_month'
  >('one_day');

  const params = {
    timeRange,
    chainId: defaultChain.id,
    page: 1,
    limit: 20,
  };

  const itemsQuery = useItemsQuery<
    typeof apiClient.collections.getTradingBoard,
    GetCollectionTradingBoardResponse['tradingBoard'][0],
    'tradingBoard',
    GetCollectionTradingBoardParams
  >({
    queryKey: ['collections', 'homepage', { timeRange }],
    queryFn: apiClient.collections.getTradingBoard,
    itemsKey: 'tradingBoard',
    params,
  });

  return (
    <div
      className={cn(
        'flex flex-col gap-3 bg-white rounded-lg p-3 md:p-4 flex-1 overflow-hidden',
        className,
      )}
    >
      <TimeRangeTabs
        value={timeRange}
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        onValueChange={(value) => setTimeRange(value as any)}
      />
      <div className="w-full overflow-x-hidden flex-1">
        <DataTable
          columns={columns}
          data={
            hasLimit
              ? itemsQuery?.items?.slice(0, 10) || []
              : itemsQuery?.items || []
          }
          className={cn(
            'items-stretch max-w-full max-h-full',
            !hasLimit ? 'overflow-y-auto' : '',
          )}
          isLoading={itemsQuery.isLoading}
          skeletonRows={10}
          skeletonClassName="h-5 my-2"
          fixedFirstColumn
          rowClassName="cursor-pointer"
          onRowClick={(row, event) => {
            if (event.ctrlKey || event.metaKey) {
              window.open(`/collections/${row.slug}`, '_blank');
            } else {
              router.push(`/collections/${row.slug}`);
            }
          }}
          {...(!hasLimit && {
            infiniteScrollProps: {
              hasNextPage: itemsQuery.hasNextPage,
              isFetching: itemsQuery.isFetching,
              fetchNextPage: itemsQuery.fetchNextPage,
              threshold: 0,
            },
          })}
        />
      </div>
    </div>
  );
}
