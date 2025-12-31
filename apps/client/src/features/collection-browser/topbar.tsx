import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { useDebounce } from '@/hooks/use-debounce';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import {
  ActivityIcon,
  ArrowDownUpIcon,
  FilterIcon,
  Grid2X2Icon,
  ListIcon,
  RefreshCwIcon,
  ShapesIcon,
  XIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConnection } from 'wagmi';
import { useUiStore, type DisplayMode } from './browser-store';
import { useSearch } from './search';

export const Topbar = ({
  className,
  refetchNfts,
  resultsCount,
  collection,
}: {
  className?: string;
  refetchNfts?: () => void;
  resultsCount?: number;
  collection?: LootexCollection;
}) => {
  const { address } = useConnection();
  const account = address ? { address } : undefined;
  const { search, setSearchParam, getSearchGroups, resetSearch, setKeywords } =
    useSearch();
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    isActivityOpen,
    setIsActivityOpen,
    displayMode,
    setDisplayMode,
    isMyItemsOpen,
    setIsMyItemsOpen,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = useUiStore();
  const [inputValue, setInputValue] = useState('');
  const debouncedValue = useDebounce(inputValue, 300);

  useEffect(() => {
    if (debouncedValue && debouncedValue.length > 0) {
      setKeywords(debouncedValue);
    } else {
      setKeywords(undefined);
    }
  }, [debouncedValue]);

  const searchGroups = getSearchGroups();
  const hasSearchGroups = searchGroups.length > 0;
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className={cn('flex gap-2 bg-white flex-col', className)}>
      <div className="flex gap-2 items-center">
        <Toggle
          variant="outline"
          pressed={isSidebarOpen}
          onPressedChange={setIsSidebarOpen}
          className="hidden md:flex"
        >
          <FilterIcon />
        </Toggle>
        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          onClick={() => setIsMobileSidebarOpen(true)}
        >
          <FilterIcon />
        </Button>
        <Tabs
          value={displayMode}
          onValueChange={(value) => setDisplayMode(value as DisplayMode)}
        >
          <TabsList>
            <TabsTrigger value="grid">
              <Grid2X2Icon size={16} />
            </TabsTrigger>
            <TabsTrigger value="list">
              <ListIcon size={16} />
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Search items"
          className="flex-1"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <Select
          defaultValue="bestListPrice"
          value={search.sortBy}
          onValueChange={(value) => setSearchParam('sortBy', value)}
        >
          {isMobile ? (
            <SelectTrigger
              className="flex md:hidden w-9 py-0 px-0 justify-center items-center"
              showIcon={false}
            >
              <ArrowDownUpIcon size={16} />
            </SelectTrigger>
          ) : (
            <SelectTrigger className="w-[160px] hidden md:flex">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
          )}

          <SelectContent>
            <SelectItem value="bestListPrice">Price low to high</SelectItem>
            <SelectItem value="-bestListPrice">Price high to low</SelectItem>
            <SelectItem value="rarityRanking">Rare to common</SelectItem>
            <SelectItem value="-rarityRanking">Common to rare</SelectItem>
          </SelectContent>
        </Select>
        {/* <Button
          variant="outline"
          className="px-2"
          onClick={refetchNfts}
          disabled={refetchNfts === undefined}
        >
          <RefreshCwIcon size={16} />
        </Button> */}
        {collection && (
          <>
            <Toggle
              variant="outline"
              pressed={isActivityOpen}
              onPressedChange={setIsActivityOpen}
              className="hidden lg:flex"
            >
              <ActivityIcon size={16} />
            </Toggle>
            {account && (
              <Toggle
                variant="outline"
                pressed={isMyItemsOpen}
                onPressedChange={setIsMyItemsOpen}
                className="hidden lg:flex"
              >
                <ShapesIcon size={16} />
              </Toggle>
            )}
          </>
        )}
      </div>
      <div className="flex justify-between items-center">
        {hasSearchGroups && (
          <div className="flex flex-row flex-wrap gap-2 items-center">
            <span className="font-body text-sm hidden md:inline">Filters:</span>
            <Button onClick={resetSearch} variant="secondary">
              Clear all
            </Button>
            {searchGroups.map((group) => {
              if (group.groupType === 'collection') {
                return (
                  <Button
                    key={group.slug}
                    variant="outline"
                    onClick={group.onRemove}
                  >
                    <span className="font-body font-bold">{group.name}</span>
                    <XIcon className="w-4 h-4" />
                  </Button>
                );
              }
              if (group.groupType === 'price') {
                return (
                  <Button
                    key={group.min}
                    variant="outline"
                    onClick={group.onRemove}
                  >
                    <span className="font-body font-normal">Price:</span>
                    <span className="font-body font-bold">
                      {group.min} - {group.max} {group.symbol}
                    </span>
                    <XIcon className="w-4 h-4" />
                  </Button>
                );
              }
              if (group.groupType === 'trait') {
                return (
                  <Button
                    key={group.traitType}
                    variant="outline"
                    onClick={group.onRemove}
                  >
                    <span className="font-body font-normal">
                      {group.traitType}:
                    </span>
                    <span className="font-body font-bold">
                      {group.traitValue}
                    </span>
                    <XIcon className="w-4 h-4" />
                  </Button>
                );
              }
            })}
          </div>
        )}
        <div className="flex-1" />
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {resultsCount} results
        </span>
      </div>
    </div>
  );
};
