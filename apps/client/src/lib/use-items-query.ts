import { type QueryKey, useInfiniteQuery } from '@tanstack/react-query';
import type {
  PaginatedParams,
  PaginatedResponse,
} from '@lootex-core/sdk/api/endpoints/utils';

export const useItemsQuery = <
  F extends (params: P) => Promise<PaginatedResponse<T, K>>,
  T = unknown,
  K extends string = 'items',
  P extends PaginatedParams = PaginatedParams,
>({
  queryFn,
  params,
  itemsKey,
  queryKey,
  enabled = true,
}: {
  queryFn: F;
  params: P;
  itemsKey: K;
  queryKey: QueryKey;
  enabled?: boolean;
}) => {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) =>
      queryFn({ limit: 10, ...params, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const {
        pagination: { page, totalPage },
      } = lastPage;

      if (page < totalPage) {
        return page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled,
  });

  return {
    ...query,
    items: query.data?.pages?.flatMap((page) => page[itemsKey]) ?? [],
  };
};
