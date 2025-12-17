'use client';

import { PageContainer } from '@/components/page-container';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveTab } from '@/hooks/use-active-tab';
import { useScreenSize } from '@/hooks/use-screen-size';
import { defaultChain } from '@/lib/wagmi';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import { useEffect } from 'react';
import { useConnection } from 'wagmi';
import InstantSellButton from '../accept-offer/instant-sell-button';
import UtilityBar from '../launchpad/utility-bar';
import { MakeOfferButton } from '../make-offer/make-offer-button';
import { Activity } from './activity/activity';
import { useUiStore } from './browser-store';
import { Header } from './header';
import { MyItems } from './my-items/my-items';
import { NftList } from './nfts';
import { Offers } from './offers';
import { SearchProvider } from './search';
import { useSelectionStore } from './selection-store';
import { Sidebar } from './sidebar';
import { useGetMyItems } from './use-get-my-items';

export default function CollectionBrowser({
  collection,
}: {
  collection: LootexCollection & {
    isRevealable: boolean;
    canRevealAt: string;
    revealUrl: string;
    isStakeable: boolean;
    stakeUrl: string;
  };
}) {
  const {
    isSidebarOpen,
    isActivityOpen,
    isMyItemsOpen,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  } = useUiStore();
  const { clear } = useSelectionStore();
  const { isLg } = useScreenSize();
  const { address } = useConnection();
  const account = address ? { address } : undefined;

  const myItemsQuery = useGetMyItems({
    chainId: defaultChain.id,
    collectionSlug: collection.slug,
    walletAddress: account?.address,
  });

  const showMyItems = account && isMyItemsOpen;

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    clear();
  }, [collection]);

  const { activeTab, setActiveTab } = useActiveTab({
    defaultTab: 'items',
    syncWithUrl: true,
  });

  return (
    <SearchProvider>
      <PageContainer className="flex flex-col gap-2 overflow-hidden flex-1">
        <Header data={collection} />
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 min-h-0 flex flex-col items-stretch gap-2"
        >
          <div className="flex flex-col-reverse items-start gap-3 lg:flex-row lg:items-center lg:gap-2 justify-between">
            <TabsList className="justify-start mb-0 items-end">
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="offers">Offers</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              {account && (
                <TabsTrigger value="my-items">
                  My Items
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-muted-foreground text-xs">
                    {myItemsQuery.data?.pages?.[0]?.pagination?.count ?? '--'}
                  </span>
                </TabsTrigger>
              )}
            </TabsList>
            <div className="flex items-center gap-2">
              {collection.bestCollectionOffer?.hasBestCollectionOrder && (
                <InstantSellButton
                  className="font-brand hidden md:inline-flex"
                  collection={collection}
                  size="default"
                />
              )}
              <MakeOfferButton
                collection={collection}
                className="font-brand hidden md:inline-flex"
                size="default"
              />
              <MakeOfferButton
                collection={collection}
                className="md:hidden flex-shrink-0"
                size="icon"
                iconOnly
              />
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <TabsContent value="items" className="h-full mt-0">
              <div className="flex gap-4 h-full items-stretch">
                {isSidebarOpen && (
                  <Sidebar
                    collection={collection}
                    className="hidden lg:flex max-w-[240px] overflow-y-auto"
                  />
                )}
                <NftList
                  collection={collection}
                  className="flex-1 overflow-y-auto"
                />
                {(showMyItems || isActivityOpen) && (
                  <div className="hidden lg:flex flex-col gap-4 w-[30%] max-w-[320px]">
                    {showMyItems && (
                      <MyItems
                        collection={collection}
                        className="flex-1 overflow-y-auto"
                        walletAddress={account?.address}
                        onExpand={() => setActiveTab('my-items')}
                      />
                    )}
                    {isActivityOpen && (
                      <Activity
                        collection={collection}
                        className="flex-1"
                        onExpand={() => setActiveTab('activity')}
                        isMiniTable
                      />
                    )}
                  </div>
                )}
              </div>
              {!isLg && (
                <Sheet
                  open={isMobileSidebarOpen}
                  onOpenChange={setIsMobileSidebarOpen}
                >
                  <SheetContent
                    side="bottom"
                    className="max-h-[90dvh] flex flex-col items-stretch bg-white"
                  >
                    <SheetHeader>
                      <SheetTitle className="font-brand">Filters</SheetTitle>
                    </SheetHeader>
                    <Sidebar
                      collection={collection}
                      className="w-full bg-transparent px-0 flex-1 min-h-0"
                      showHeader={false}
                    />
                  </SheetContent>
                </Sheet>
              )}
            </TabsContent>
            {account && (
              <TabsContent value="my-items" className="h-full mt-0">
                <MyItems
                  collection={collection}
                  className="h-full"
                  walletAddress={account?.address}
                  isTab={true}
                />
              </TabsContent>
            )}
            <TabsContent value="offers" className="h-full mt-0">
              <Offers collection={collection} className="h-full" />
            </TabsContent>
            <TabsContent value="activity" className="h-full mt-0">
              <Activity
                collection={collection}
                className="h-full"
                isTab={true}
              />
            </TabsContent>
          </div>
        </Tabs>
      </PageContainer>
    </SearchProvider>
  );
}
