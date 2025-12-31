'use client';

import InfiniteScroll from '@/components/ui/infinte-scroll';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { HeroBannerType } from '@/lib/cms';
import { apiClient } from '@/lib/lootex';
import { useItemsQuery } from '@/lib/use-items-query';
import { cn } from '@/lib/utils';
import type {
  PaginatedParams,
  PaginatedResponse,
} from '@lootex-core/sdk/api/endpoints/utils';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import { Loader2 } from 'lucide-react';
import { HeroBannerCarousel } from './hero-banner-carousel';
import { LaunchpadCard, LaunchpadCardSkeleton } from './launchpad-card';

export type LaunchpadContract = {
  id: string;
  address: `0x${string}`;
  name: string;
  dropUrls: string[];
  collection: LootexCollection;
  price: string;
  priceSymbol: string;
  totalSupply: string;
  maxSupply: string;
  startTime: string;
  status: string;
  schemaName: string;
  tokenId: string | null;
};

export type GetLaunchpadContractsParams = PaginatedParams & {
  chainId: number;
  addresses?: `0x${string}`[];
  isVerified?: boolean;
};

export type GetLaunchpadContractsResponse = PaginatedResponse<
  LaunchpadContract,
  'contracts'
>;

export const adaptHeroBanner = (heroBanner: HeroBannerType) => {
  return {
    id: heroBanner.id,
    title: heroBanner.title ?? '',
    description: heroBanner.description ?? '',
    imageUrl: heroBanner.backgroundImage?.url,
    imageUrlMobile: heroBanner.backgroundImageMobile?.url,
    actions: heroBanner.actions.map((action) => ({
      id: action.id,
      text: action.text ?? '',
      url: action.url ?? '#',
    })),
    targetDate: heroBanner.countdown?.targetDate ?? undefined,
    countdownType: heroBanner.countdown?.countdownType ?? undefined,
    live: heroBanner.live,
  };
};

const LaunchpadList = ({
  type,
  queryParams,
}: {
  type: 'current' | 'past';
  queryParams?: Partial<GetLaunchpadContractsParams>;
}) => {
  const queryFn = (params: GetLaunchpadContractsParams) =>
    apiClient.request<GetLaunchpadContractsResponse>({
      method: 'GET',
      path: `/v3/studio/contracts/launchpad/${type}`,
      query: params,
    });

  const itemsQuery = useItemsQuery<
    typeof queryFn,
    LaunchpadContract,
    'contracts',
    GetLaunchpadContractsParams
  >({
    queryKey: ['launchpad', { type, ...queryParams }],
    queryFn,
    itemsKey: 'contracts',
    params: {
      chainId: 1868,
      ...queryParams,
    },
  });

  return (
    <div className="w-full">
      <div
        className={cn(
          'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-3',
        )}
      >
        {itemsQuery.isLoading
          ? Array.from({ length: 10 }).map((_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              <LaunchpadCardSkeleton key={index} />
            ))
          : itemsQuery?.items?.map((contract) => {
              const percentage =
                (Number(contract.totalSupply) / Number(contract.maxSupply)) *
                100;

              const isLive =
                contract.status !== 'SaleEnd' &&
                new Date(contract.startTime) < new Date();
              const isEnded = contract.status === 'SaleEnd';
              const endedReason =
                Number(contract.totalSupply) >= Number(contract.maxSupply)
                  ? 'Sold out 🎉'
                  : 'Ended';

              const isERC1155 = contract.schemaName === 'ERC1155';

              return (
                <LaunchpadCard
                  key={contract.id}
                  slug={contract.collection.slug}
                  name={contract.name}
                  imageUrl={
                    contract?.dropUrls?.[0] ||
                    contract?.collection?.logoImageUrl ||
                    ''
                  }
                  collection={contract.collection}
                  price={contract.price}
                  symbol={contract.priceSymbol}
                  percentage={percentage}
                  isLive={isLive}
                  isEnded={isEnded}
                  endedReason={endedReason}
                  tokenId={
                    isERC1155 && contract.tokenId ? contract.tokenId : undefined
                  }
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
  );
};

export default function LaunchpadPage({
  heroBanners,
}: {
  heroBanners: HeroBannerType[];
}) {
  return (
    <div className="flex flex-col w-full py-2 md:py-4 max-w-screen-xl mx-auto px-4 md:px-6 items-stretch gap-4">
      <HeroBannerCarousel items={heroBanners.map(adaptHeroBanner)} />
      <div className="flex flex-col gap-4 items-stretch bg-white rounded-lg p-3">
        <Tabs defaultValue="verified">
          <TabsList>
            <TabsTrigger value="verified">Verified</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
          <TabsContent value="verified">
            <LaunchpadList type="current" queryParams={{ isVerified: true }} />
          </TabsContent>
          <TabsContent value="community">
            <LaunchpadList type="current" queryParams={{ isVerified: false }} />
          </TabsContent>
          <TabsContent value="all">
            <LaunchpadList type="current" />
          </TabsContent>
          <TabsContent value="past">
            <LaunchpadList type="past" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
