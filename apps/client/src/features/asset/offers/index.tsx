'use client';

import { DataTable } from '@/components/data-table';
import { cn } from '@/lib/utils';
import type { OwnerAccount } from '@/sdk/exports/account';
import { type Asset, isErc1155Asset } from '@/sdk/exports/asset';
import { useConnection } from 'wagmi';
import { useGetErc1155Balance } from '../use-get-erc1155-balance';
import { useGetOffers } from '../use-get-offers';
import { getColumns } from './columns';

export const Offers = ({
  asset,
  className,
  owner,
}: {
  asset: Asset;
  className?: string;
  owner?: OwnerAccount;
}) => {
  const isErc1155 = isErc1155Asset(asset);

  const itemsQuery = useGetOffers({ asset });

  const { address } = useConnection();
  const account = address ? { address } : undefined;

  const { data: erc1155Balance, isSuccess: isErc1155BalanceSuccess } =
    useGetErc1155Balance({
      asset,
      accountAddress: account?.address as `0x${string}`,
    });

  const isOwner = isErc1155
    ? BigInt(erc1155Balance ?? 0) > BigInt(0)
    : owner &&
      account &&
      owner?.address?.toLowerCase() === account?.address?.toLowerCase();

  return (
    <div
      className={cn('flex flex-col gap-3 rounded-2xl bg-white p-3', className)}
    >
      <DataTable
        columns={getColumns({ isErc1155 })}
        data={
          itemsQuery.items?.map((item) => ({
            ...item,
            offerAsset: asset,
            isOwner,
          })) ?? []
        }
        className="flex-1 min-h-0"
        isLoading={itemsQuery.isLoading}
        skeletonClassName="my-2"
        infiniteScrollProps={{
          hasNextPage: itemsQuery.hasNextPage,
          isFetching: itemsQuery.isFetching,
          fetchNextPage: itemsQuery.fetchNextPage,
          threshold: 0,
        }}
      />
    </div>
  );
};
