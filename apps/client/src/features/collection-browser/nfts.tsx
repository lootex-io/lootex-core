'use client';

import { DataTable } from '@/components/data-table';
import { useModal } from '@/components/modal-manager';
import { Button } from '@/components/ui/button';
import InfiniteScroll from '@/components/ui/infinte-scroll';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { apiClient } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { useItemsQuery } from '@/lib/use-items-query';
import { cn } from '@/lib/utils';
import type { RowSelectionState } from '@tanstack/react-table';
import type { Asset } from '@/sdk/exports/asset';
import type { LootexCollection } from '@/sdk/exports/collection';
import { Loader2, PaintbrushIcon } from 'lucide-react';
import { useState } from 'react';
import { Cart } from '../cart/cart';
import { AssetCard } from './asset-card';
import { useUiStore } from './browser-store';
import { columns } from './nft-columns';
import { type SearchParams, useSearch } from './search';
import { useSelectionStore } from './selection-store';
import { Topbar } from './topbar';

const maxSelected = 20;

const filterParamsToApiParams = (params: SearchParams) => {
  const apiParams: Record<
    string,
    | string
    | number
    | {
        traitType: string;
        value: string;
      }[]
    | {
        slug: string;
        name?: string;
      }
  > = {};

  for (const [key, value] of Object.entries(params)) {
    if (key === 'collection') {
      // @ts-ignore
      apiParams.collectionSlugs = [value?.slug] ?? [];
    } else if (key === 'traits') {
      apiParams[key] = JSON.stringify(value);
    } else {
      // @ts-ignore
      apiParams[key] = value;
    }
  }

  return apiParams;
};

export const NftList = ({
  collection,
  accountAddress,
  className,
  isOwner,
}: {
  collection?: LootexCollection;
  accountAddress?: string;
  className?: string;
  isOwner?: boolean;
}) => {
  const { search } = useSearch();
  const { isSidebarOpen, isActivityOpen, displayMode, isMyItemsOpen } =
    useUiStore();

  const params = {
    collectionSlugs: collection?.slug ? [collection.slug] : [],
    sortBy: 'bestListPrice',
    ...filterParamsToApiParams(search),
    isCount: true,
    chainId: defaultChain.id,
    walletAddress: accountAddress,
    limit: 20,
    page: 1,
  };

  const itemsQuery = useItemsQuery<typeof apiClient.explore.assets, Asset>({
    queryKey: ['nfts', params],
    queryFn: apiClient.explore.assets,
    itemsKey: 'items',
    params,
  });

  const { onOpen: onOpenSellModal } = useModal('sell');
  const { onOpen: onOpenTransferModal } = useModal('transfer');

  const rightSidebarOpen = isActivityOpen || isMyItemsOpen;
  const getGridCols = () => {
    if (isSidebarOpen && rightSidebarOpen) {
      return 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
    }
    if (isSidebarOpen || rightSidebarOpen) {
      return 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';
    }

    return 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7';
  };

  const { checkIsSelected, toggleItem, selectedItems, setSelectedItems } =
    useSelectionStore();

  const onSliderChange = (value: number[]) => {
    const assets = itemsQuery.items?.slice(0, value[0]);
    if (assets) {
      setSelectedItems(assets);
    }
  };

  const maxItems = isOwner
    ? Math.min(itemsQuery.items?.length ?? 0, 20)
    : Math.min(
        itemsQuery.items?.filter((nft) => nft.order?.listing).length ?? 0,
        20,
      );

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isSweepOpen, setIsSweepOpen] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl bg-white relative overflow-hidden p-3',
        className,
      )}
    >
      <Topbar
        className="pb-2"
        refetchNfts={itemsQuery.refetch}
        resultsCount={itemsQuery.data?.pages[0]?.pagination?.count}
        collection={collection}
      />

      <div className="flex gap-4 items-start relative flex-1 overflow-hidden mb-10">
        {displayMode === 'grid' && (
          <div className="w-full h-full pb-3 overflow-y-auto">
            <div
              className={cn(
                'grid gap-2 md:gap-3 flex-1 grid-cols-2',
                getGridCols(),
              )}
            >
              {itemsQuery.isLoading
                ? Array.from({ length: 10 }).map((_, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    <AssetCard key={index} isLoading />
                  ))
                : itemsQuery.items?.map((nft) => {
                    const isSelected = checkIsSelected(nft);

                    return (
                      <AssetCard
                        key={nft.assetId}
                        asset={nft}
                        isSelected={isSelected}
                        toggleItem={toggleItem}
                        isToggleDisabled={
                          !isSelected && selectedItems.length >= maxSelected
                        }
                        isOwner={isOwner}
                      />
                    );
                  })}
            </div>

            <InfiniteScroll
              hasMore={itemsQuery.hasNextPage}
              isLoading={itemsQuery.isFetching}
              next={itemsQuery.fetchNextPage}
              threshold={0}
            >
              {itemsQuery.hasNextPage && (
                <Loader2 className="my-4 h-8 w-8 animate-spin mx-auto" />
              )}
            </InfiniteScroll>
          </div>
        )}
        {displayMode === 'list' && (
          <DataTable
            columns={columns.filter((column) =>
              isOwner ? true : column.id !== 'action',
            )}
            data={
              itemsQuery.items?.map((item) => ({
                ...item,
                isOwner,
                showCollectionName: !collection,
              })) ?? []
            }
            rowSelection={rowSelection}
            setRowSelection={setRowSelection}
            isLoading={itemsQuery.isLoading}
            skeletonRows={10}
            skeletonClassName="h-5 my-2"
            infiniteScrollProps={{
              hasNextPage: itemsQuery.hasNextPage,
              isFetching: itemsQuery.isFetching,
              fetchNextPage: itemsQuery.fetchNextPage,
              threshold: 0,
            }}
          />
        )}
      </div>
      <div className="flex bg-white border-t flex-col md:flex-row items-stretch md:items-center justify-between gap-2 py-2 px-3 absolute bottom-0 left-0 right-0 w-full">
        <div
          className={cn(
            'hidden md:flex items-center justify-start gap-2 flex-1',
            isSweepOpen && 'flex',
          )}
        >
          <Input
            type="number"
            value={selectedItems.length}
            min={0}
            max={maxItems}
            className="w-16 text-sm text-center h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            onChange={(e) => {
              const value = Math.min(
                Math.max(0, Number.parseInt(e.target.value) || 0),
                maxItems,
              );
              const assets = itemsQuery.items?.slice(0, value);
              if (assets) {
                setSelectedItems(assets);
              }
            }}
          />
          <Slider
            defaultValue={[0]}
            value={[selectedItems.length || 0]}
            max={Math.min(maxItems, 20)}
            step={1}
            className="flex-1 md:max-w-[160px]"
            onValueChange={onSliderChange}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setIsSweepOpen(!isSweepOpen)}
          >
            <PaintbrushIcon className="w-4 h-4" />
          </Button>
          {isOwner ? (
            <>
              <Button
                disabled={!selectedItems.length}
                onClick={() => onOpenTransferModal({ assets: selectedItems })}
                variant="outline"
              >
                Transfer
              </Button>
              <Button
                disabled={!selectedItems.length}
                onClick={() => onOpenSellModal({ assets: selectedItems })}
              >
                {selectedItems.length
                  ? `List ${selectedItems.length} items`
                  : 'List'}
              </Button>
            </>
          ) : (
            <Cart />
          )}
        </div>
      </div>
    </div>
  );
};
