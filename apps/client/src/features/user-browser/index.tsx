'use client';

import { PageContainer } from '@/components/page-container';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveTab } from '@/hooks/use-active-tab';
import { useScreenSize } from '@/hooks/use-screen-size';
import { useToast } from '@/hooks/use-toast';
import { formatAddress } from 'lootex/utils';
import { Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useConnection } from 'wagmi';
import { Activity } from '../collection-browser/activity/activity';
import { useUiStore } from '../collection-browser/browser-store';
import { NftList } from '../collection-browser/nfts';
import { SearchProvider } from '../collection-browser/search';
import { Sidebar } from '../collection-browser/sidebar';
import { Offers } from './offers';

type MyItemsProps = {
  accountAddress?: string;
};

// ...

export default function MyItemsBrowser({ accountAddress }: MyItemsProps) {
  const { isSidebarOpen, isMobileSidebarOpen, setIsMobileSidebarOpen } =
    useUiStore();
  const { activeTab, setActiveTab } = useActiveTab({
    defaultTab: 'items',
    syncWithUrl: true,
  });
  const { toast } = useToast();
  const { isLg } = useScreenSize();
  const { address } = useConnection();
  const account = address ? { address } : undefined;

  const isOwner =
    account?.address?.toLowerCase() === accountAddress?.toLowerCase();

  // ...

  return (
    <SearchProvider>
      <PageContainer className="flex flex-col gap-2 overflow-hidden flex-1">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500" />
          <h1 className="font-brand text-lg md:text-xl">
            {formatAddress(accountAddress ?? '')}
          </h1>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => {
              navigator.clipboard.writeText(accountAddress ?? '');
              toast({
                title: 'Address copied to clipboard',
              });
            }}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-1 gap-4 items-stretch min-h-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 min-h-0 flex flex-col items-stretch gap-2 min-w-0"
          >
            <TabsList className="justify-start self-start">
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="offers">Offers</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <div className="flex-1 min-h-0">
              <TabsContent value="items" className="h-full mt-0">
                <div className="flex gap-4 h-full items-stretch">
                  {isSidebarOpen && (
                    <Sidebar
                      className="hidden lg:flex max-w-[240px] overflow-y-auto"
                      accountAddress={accountAddress}
                    />
                  )}
                  <NftList
                    accountAddress={accountAddress}
                    className="h-full flex-1"
                    isOwner={isOwner}
                  />
                </div>
              </TabsContent>
              <TabsContent value="offers" className="h-full mt-0">
                <Offers accountAddress={accountAddress} className="h-full" />
              </TabsContent>
              <TabsContent value="activity" className="h-full mt-0">
                <Activity
                  accountAddress={accountAddress}
                  className="h-full"
                  isOwner={isOwner}
                />
              </TabsContent>
            </div>
          </Tabs>
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
                accountAddress={accountAddress}
                className="w-full bg-transparent px-0 flex-1 min-h-0"
                showHeader={false}
              />
            </SheetContent>
          </Sheet>
        )}
      </PageContainer>
    </SearchProvider>
  );
}
