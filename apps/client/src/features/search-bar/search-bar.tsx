import { CollectionCell, PriceCell, UsdCell } from '@/components/data-cells';
import { Image } from '@/components/image';
import { Button } from '@/components/ui/button';
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import InfiniteScroll from '@/components/ui/infinte-scroll';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { apiClient } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { useItemsQuery } from '@/lib/use-items-query';
import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { LootexCollection } from '@/sdk/exports/collection';
import { Loader2, SearchIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export const SearchBar = ({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const [inputValue, setInputValue] = useState('');
  const debouncedValue = useDebounce(inputValue, 300);

  const params = {
    keywords: debouncedValue?.trim() || undefined,
    page: 1,
    limit: 20,
    chainId: defaultChain.id,
  };

  const itemsQuery = useItemsQuery<
    typeof apiClient.explore.collections,
    LootexCollection,
    'collections'
  >({
    params,
    itemsKey: 'collections',
    queryKey: ['search-collections', params],
    queryFn: apiClient.explore.collections,
    enabled: !!open,
  });

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <SearchIcon className="w-4 h-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className={cn(
              'fixed left-[50%] top-2 z-50 grid w-full max-w-xl translate-x-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg',
            )}
          >
            <div className="flex flex-col h-[520px] max-h-[90dvh] gap-2 w-full p-3 overflow-hidden">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search collection name or address"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="grid">
                  <div className="grid grid-cols-[1fr,100px] md:grid-cols-[1fr,100px,100px] gap-4 items-center px-2 py-2 text-sm text-muted-foreground font-medium">
                    <div>Collection</div>
                    <div className="text-right">Floor Price</div>
                    <div className="text-right hidden md:block">Total Vol.</div>
                  </div>
                  {!itemsQuery.items?.length && !itemsQuery.isFetching && (
                    <div className="text-center text-muted-foreground py-4">
                      No results found
                    </div>
                  )}
                  {(itemsQuery.items ?? []).map((item) => (
                    <Link
                      key={item.slug}
                      href={`/collections/${item.slug}`}
                      className="grid grid-cols-[1fr,100px] md:grid-cols-[1fr,100px,100px] gap-4 items-center py-2 px-2 hover:bg-secondary/80 transition-colors duration-200 rounded-md group"
                      onClick={() => setOpen(false)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Image
                          src={item.logoImageUrl ?? ''}
                          alt={item.name}
                          className="shrink-0 w-9 h-9 rounded"
                        />
                        <CollectionCell
                          collection={item}
                          showLogo={false}
                          titleClassName="truncate font-bold max-w-[200px] md:max-w-[300px]"
                        />
                      </div>
                      <div className="text-right">
                        <PriceCell
                          price={item.orderInfo?.floorPrice?.toString()}
                          symbol={item.priceSymbol}
                        />
                      </div>
                      <div className="text-right hidden md:block">
                        <UsdCell
                          number={item.orderInfo?.totalVolume?.toString()}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
                <InfiniteScroll
                  hasMore={itemsQuery.hasNextPage}
                  isLoading={itemsQuery.isFetching}
                  next={itemsQuery.fetchNextPage}
                  threshold={0}
                >
                  {itemsQuery.isFetching && (
                    <Loader2 className="my-4 h-6 w-6 animate-spin mx-auto" />
                  )}
                </InfiniteScroll>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
};
