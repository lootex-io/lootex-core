'use client';

import { CollectionCell, PriceCell, UsdCell } from '@/components/data-cells';
import { useModal } from '@/components/modal-manager';
import { ShareMenu } from '@/components/share-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { apiClient } from '@/lib/lootex';
import { cn } from '@/lib/utils';
import { useOrigin } from '@/utils/use-origin';
import { useQuery } from '@tanstack/react-query';
import type { Asset } from '@lootex-core/sdk/asset';
import { getChain } from '@lootex-core/sdk/chains';
import { ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';
import { useConnection } from 'wagmi';
import { Activity } from './activity';
import AssetViewer from './asset-viewer';
import { Attributes } from './attributes';
import { Description } from './description';
import { Details } from './details';
import { Listings } from './listings';
import { Offers } from './offers';
import { PriceBox } from './price-box';
import { useGetBestListing } from './use-get-best-listing';
import { useGetOffers } from './use-get-offers';

type AssetTemplateProps = {
  asset?: Asset;
  assetId?: string;
  collectionSlug?: string;
  isDrawer?: boolean;
};

export const AssetTemplate = ({
  asset,
  assetId,
  collectionSlug,
  isDrawer,
}: AssetTemplateProps) => {
  const { address } = useConnection();
  const account = address ? { address } : undefined;

  const _collectionSlug = collectionSlug ?? asset?.collectionSlug;
  const { data: collection, isLoading: isCollectionLoading } = useQuery({
    queryKey: ['collection', _collectionSlug],
    queryFn: () =>
      apiClient.collections.getCollection(_collectionSlug as string),
    enabled: !!_collectionSlug,
    staleTime: 60 * 1000,
  });

  const _assetId =
    assetId ??
    (asset &&
      `${asset?.collectionChainShortName}/${asset?.contractAddress}/${asset?.assetTokenId}`) ??
    undefined;

  const { data: fullAsset } = useQuery({
    queryKey: ['full-asset', { assetId: _assetId }],
    queryFn: () => apiClient.assets.getAsset(_assetId as string),
    placeholderData: asset,
    enabled: !!_assetId,
    staleTime: 60 * 1000,
  });

  const { data: ownerAccounts, isLoading: isOwnerAccountsLoading } = useQuery({
    queryKey: ['ownerAccounts', { assetId: _assetId }],
    queryFn: () =>
      apiClient.accounts.getAccountsByAsset({
        chainId:
          fullAsset?.contractChainId || fullAsset?.collectionChainShortName
            ? getChain(fullAsset?.collectionChainShortName).id
            : undefined,
        contractAddress: fullAsset?.contractAddress,
        tokenId: fullAsset?.assetTokenId,
        limit: 1,
        page: 1,
      }),
    enabled:
      !!fullAsset?.contractAddress && !!fullAsset?.assetTokenId && !!_assetId,
  });

  const { onClose: closeAssetModal } = useModal('asset');
  const origin = useOrigin();
  const assetLink = fullAsset
    ? `/assets/${fullAsset?.collectionChainShortName}/${fullAsset?.contractAddress}/${fullAsset?.assetTokenId}`
    : undefined;

  const { data: offersResult, isLoading: isOffersLoading } = useGetOffers({
    asset: fullAsset,
  });

  const { data: bestListing, isLoading: isBestListingLoading } =
    useGetBestListing({
      asset: fullAsset,
    });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div
        className={cn(
          'flex justify-between px-4 mb-3 md:mb-4',
          isDrawer ? 'pt-2' : 'pt-4 pr-14',
        )}
      >
        <div className="flex flex-col items-start">
          <h1 className="text-xl md:text-2xl font-brand">
            {fullAsset?.assetName}
          </h1>
          {isCollectionLoading ? (
            <Skeleton className="w-24 h-4" />
          ) : (
            <CollectionCell
              collection={collection}
              showLogo={false}
              titleClassName="text-muted-foreground text-sm md:text-base font-normal"
              onClick={() => closeAssetModal()}
            />
          )}
        </div>

        <div className="flex gap-2">
          <ShareMenu
            url={`${origin}${assetLink}`}
            title={fullAsset?.assetName ?? ''}
            variant="secondary"
            size="icon"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="icon" asChild>
                  <Link href={assetLink ?? '#'} target="_blank">
                    <ExternalLinkIcon className="w-4 h-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go to full page</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Tabs
        defaultValue="info"
        className="px-4 flex flex-col flex-1 items-stretch overflow-hidden"
      >
        <TabsList className="justify-start self-start">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="listings">
            Listings{' '}
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-muted-foreground text-xs">
              {isBestListingLoading
                ? '-'
                : (bestListing?.pagination?.count ?? '0')}
            </span>
          </TabsTrigger>
          <TabsTrigger value="offers">
            Offers{' '}
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-muted-foreground text-xs">
              {isOffersLoading
                ? '-'
                : (offersResult?.pages?.[0]?.pagination?.count ?? '0')}
            </span>
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="overflow-y-auto flex-1 pb-3">
          <div className="flex flex-col flex-1 gap-3 md:gap-4 ">
            <div className="flex flex-col md:flex-row items-stretch  md:items-start gap-4">
              <div className="flex-1 aspect-square rounded-lg overflow-hidden min-h-0">
                <AssetViewer asset={fullAsset} />
              </div>
              <div className="flex flex-col flex-1 gap-3 md:gap-4">
                <PriceBox
                  asset={fullAsset}
                  collection={collection}
                  isLoadingOwners={isOwnerAccountsLoading}
                  owners={ownerAccounts?.accounts}
                />
                <Attributes asset={fullAsset ?? asset} />
              </div>
            </div>
            <div className="flex gap-3 md:gap-4 flex-col md:flex-row items-stretch md:items-start">
              <Description asset={fullAsset} className="flex-1" />
              <Details asset={fullAsset} className="flex-1" />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="listings" className="overflow-y-auto flex-1 pb-3">
          {fullAsset && (
            <Listings
              asset={fullAsset}
              className="overflow-y-auto h-full"
              owner={ownerAccounts?.accounts[0]}
            />
          )}
        </TabsContent>
        <TabsContent value="offers" className="overflow-y-auto flex-1 pb-3">
          {fullAsset && (
            <Offers
              asset={fullAsset}
              className="overflow-y-auto h-full"
              owner={ownerAccounts?.accounts[0]}
            />
          )}
        </TabsContent>
        <TabsContent value="activity" className="overflow-y-auto flex-1 pb-3">
          {collection && (
            <Activity
              collection={collection}
              asset={fullAsset}
              className="overflow-y-auto h-full"
            />
          )}
        </TabsContent>
      </Tabs>
      <div className="flex justify-between sticky bottom-0 left-0 right-0 bg-white w-full px-2 py-1 border-t">
        <Button
          variant="link"
          asChild
          className="text-muted-foreground font-body font-bold text-sm"
          onClick={closeAssetModal}
        >
          <Link href={`/collections/${fullAsset?.collectionSlug}`}>
            {fullAsset?.collectionName}
          </Link>
        </Button>
        <div className="flex gap-4 pr-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-body text-xs md:text-sm">
              Floor
            </span>
            <PriceCell
              price={collection?.floorPrice?.toString() ?? '--'}
              symbol={collection?.priceSymbol ?? 'ETH'}
              className="text-xs md:text-sm"
            />
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-muted-foreground font-body text-xs md:text-sm">
              24H Vol.
            </span>
            <UsdCell
              // @ts-ignore
              number={collection?.oneDayTradingVolume?.toString() ?? '--'}
              className="text-xs md:text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
