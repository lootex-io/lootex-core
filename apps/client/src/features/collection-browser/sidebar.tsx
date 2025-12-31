'use client';

import { CollectionCell } from '@/components/data-cells';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { apiClient } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import type { TraitValue } from '@lootex-core/sdk/api/endpoints/collection';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import { XIcon } from 'lucide-react';
import { useUiStore } from './browser-store';
import { useSearch } from './search';

const Collections = ({ accountAddress }: { accountAddress?: string }) => {
  const { search, setSearchParam } = useSearch();
  const { data } = useQuery({
    queryKey: ['account-collections', accountAddress],
    queryFn: () =>
      apiClient.collections.personal({
        // @ts-ignore
        walletAddress: accountAddress ?? '',
        page: 1,
        limit: 20,
        chainId: defaultChain.id,
      }),
    enabled: !!accountAddress,
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h2 className="font-bold mb-2">Collections</h2>
      <ToggleGroup
        type="single"
        className="flex flex-col justify-start items-stretch overflow-y-auto flex-1"
        value={search.collection?.slug ?? ''}
        onValueChange={(value) => {
          if (value) {
            const collectionName = data?.collections.find(
              (collection) => collection.slug === value,
            )?.name;
            setSearchParam('collection', {
              slug: value,
              name: collectionName,
            });
          } else {
            setSearchParam('collection', undefined);
          }
        }}
      >
        {data?.collections.map((collection) => (
          <ToggleGroupItem
            key={collection.slug}
            value={collection.slug}
            className="justify-start h-10 rounded-sm data-[state=on]:font-bold flex-shrink-0"
          >
            <CollectionCell
              collection={collection}
              titleComponent="span"
              titleClassName="text-sm truncate"
              isLink={false}
            />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

const Status = () => {
  const { search, setSearchParam } = useSearch();

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-bold">Status</h2>
      <RadioGroup
        defaultValue="all"
        value={search.orderStatus?.[0] ?? 'all'}
        onValueChange={(value) => {
          if (value === 'all') {
            setSearchParam('orderStatus', undefined);
          } else {
            setSearchParam('orderStatus', [value]);
          }
        }}
      >
        <div className="flex items-center gap-2 justify-between cursor-pointer">
          <RadioGroupItem value="all" id="all" />
          <Label htmlFor="all" className="flex-1 cursor-pointer">
            All
          </Label>
        </div>
        <div className="flex items-center gap-2 justify-between cursor-pointer">
          <RadioGroupItem value="listing" id="listing" />
          <Label htmlFor="listing" className="flex-1 cursor-pointer">
            Buy Now
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};

const PriceRange = ({ collection }: { collection?: LootexCollection }) => {
  const { search, setSearch, setSearchParam } = useSearch();

  const defaultSymbol = collection?.priceSymbol || 'ETH';
  const symbol = search.priceSymbol || defaultSymbol;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-bold">Price Range</h2>
      <div className="flex gap-2">
        <Input
          type="number"
          placeholder="Min"
          value={search.priceMin ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              setSearch({
                ...search,
                priceMin: e.target.value,
                priceSymbol: symbol,
                orderStatus: ['listing'],
              });
            } else {
              setSearch({
                ...search,
                priceMin: undefined,
                orderStatus: undefined,
              });
            }
          }}
        />
        <Input
          type="number"
          placeholder="Max"
          value={search.priceMax ?? ''}
          onChange={(e) => {
            if (e.target.value) {
              setSearch({
                ...search,
                priceMax: e.target.value,
                priceSymbol: symbol,
                orderStatus: ['listing'],
              });
            } else {
              setSearch({
                ...search,
                priceMax: undefined,
                orderStatus: undefined,
              });
            }
          }}
        />
      </div>
      <Select
        defaultValue={defaultSymbol}
        value={search.priceSymbol || defaultSymbol}
        onValueChange={(value) => setSearchParam('priceSymbol', value)}
      >
        <SelectTrigger>
        <SelectValue placeholder="Select currency" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={defaultSymbol}>{defaultSymbol}</SelectItem>
      </SelectContent>
    </Select>
  </div>
);
};

const Traits = ({
  traits,
  params,
  onChange,
}: {
  traits: Record<string, Record<string, TraitValue>>;
  params: { traitType: string; value: string }[];
  onChange: (nextParams: { traitType: string; value: string }[]) => void;
}) => {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h2 className="font-bold">Traits</h2>
      <Accordion type="multiple" className="flex-1 min-h-0 overflow-y-auto">
        {Object.entries(traits).map(([trait, values]) => (
          <AccordionItem key={trait} value={trait}>
            <AccordionTrigger className="font-bold capitalize">
              <div className="flex items-center justify-between gap-1 flex-1 pr-1">
                <span className="flex items-center gap-2">
                  {trait}{' '}
                  {params?.some((param) => param.traitType === trait) && (
                    <Badge className="bg-[#FFE9A8] hover:bg-[#FFE9A8] text-[#2C2C2C] font-body text-xs">
                      {
                        params?.filter((param) => param.traitType === trait)
                          .length
                      }
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground text-sm font-bold">
                  {Object.keys(values).length}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              {Object.entries(values).map(([value, traitValue]) => (
                <div
                  key={value}
                  className="flex justify-between cursor-pointer text-sm py-[2px]"
                >
                  <Checkbox
                    id={value}
                    checked={params?.some(
                      (param) =>
                        param.traitType === trait && param.value === value,
                    )}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange([...params, { traitType: trait, value }]);
                      } else {
                        onChange(
                          params.filter((param) => param.value !== value),
                        );
                      }
                    }}
                    className="rounded"
                  />
                  <label
                    htmlFor={value}
                    className="flex-1 cursor-pointer flex justify-between pl-2 capitalize"
                  >
                    {value}
                    <span className="text-xs text-muted-foreground">
                      {typeof traitValue === 'number'
                        ? traitValue
                        : traitValue.count}
                    </span>
                  </label>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export const Sidebar = ({
  collection,
  className,
  showHeader = true,
  accountAddress,
}: {
  collection?: LootexCollection;
  accountAddress?: string;
  className?: string;
  showHeader?: boolean;
}) => {
  const { search, setSearchParam } = useSearch();
  const { setIsSidebarOpen } = useUiStore();

  const { data } = useQuery({
    queryKey: ['traits', collection?.slug],
    queryFn: () =>
      apiClient.collections.getTraits({
        collectionSlug: collection?.slug ?? '',
      }),
    enabled: !!collection,
  });

  return (
    <div
      className={cn(
        'flex flex-col gap-4 p-3 pt-0 rounded-md bg-white relative',
        className,
      )}
    >
      {showHeader && (
        <div className="flex justify-between items-center sticky top-0 bg-white pt-3">
          <h3 className="font-bold font-brand text-lg">Filters</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(false)}
            className="text-muted-foreground"
          >
            <XIcon size={16} />
          </Button>
        </div>
      )}
      <Status />
      <Separator className="opacity-50" />
      <PriceRange collection={collection} />

      {data?.traits && Object.keys(data.traits).length > 0 && (
        <>
          <Separator className="opacity-50" />
          <Traits
            traits={data.traits}
            params={search.traits ?? []}
            onChange={(nextParams) => setSearchParam('traits', nextParams)}
          />
        </>
      )}
      {accountAddress && (
        <>
          <Separator className="opacity-50" />
          <Collections accountAddress={accountAddress} />
        </>
      )}
    </div>
  );
};
