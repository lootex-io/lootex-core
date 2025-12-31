'use client';

import { CopyButton } from '@/components/copy-button';
import {
  CollectionCell,
  NumberCell,
  PercentageCell,
  PriceCell,
  UsdCell,
} from '@/components/data-cells';
import { Image } from '@/components/image';
import { Link } from '@/components/link';
import { ShareMenu } from '@/components/share-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { defaultChain } from '@/lib/wagmi';
import { cn } from '@/lib/utils';
import { getBlockExplorerUrl } from '@/utils/block-explorer';
import { useOrigin } from '@/utils/use-origin';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import { formatAddress } from '@lootex-core/sdk/utils';
import { ChevronDown, ExternalLinkIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const AddressLink = ({
  address,
  name,
  slug,
  className,
}: {
  address: string;
  name: string;
  slug: string;
  className?: string;
}) => {
  const origin = useOrigin();

  return (
    <div className={cn('flex items-center', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={getBlockExplorerUrl(defaultChain.id, address)}
              className="font-bold text-sm"
            >
              {formatAddress(address)}
              <ExternalLinkIcon className="w-4 h-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>View on block explorer</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Separator orientation="vertical" className="h-4 ml-2 mr-1" />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <CopyButton value={address} variant="ghost" size="icon-sm" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Copy contract address</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ShareMenu
        url={`${origin}/collections/${slug}`}
        title={name}
        size="icon-sm"
      />
    </div>
  );
};
export const Header = ({ data }: { data: LootexCollection }) => {
  const [showStatsInMobile, setShowStatsInMobile] = useState(false);
  const router = useRouter();

  return (
    <div className="flex justify-between flex-col gap-2 md:gap-4 md:flex-row md:flex-wrap">
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-9 h-9 md:w-[60px] md:h-[60px] relative">
          {data.logoImageUrl ? (
            <Image
              src={data.logoImageUrl}
              alt={data.name}
              fill
              className="w-full h-full rounded md:rounded-md"
            />
          ) : (
            <div className="w-full h-full rounded md:rounded-md" />
          )}
        </div>
        <div className="flex flex-col gap-1 items-start flex-1 min-w-0">
          <div className="flex items-center gap-1 max-w-full">
            <div className="flex items-center gap-1">
              <CollectionCell
                collection={data}
                showLogo={false}
                titleComponent="h1"
                titleClassName="text-lg md:text-xl font-brand truncate"
                className="max-w-[160px] sm:max-w-[340px] md:max-w-none"
                showMintingTag
              />
            </div>
            <Button
              className="md:hidden flex-shrink-0"
              variant="ghost"
              size="icon"
              onClick={() => setShowStatsInMobile(!showStatsInMobile)}
            >
              <ChevronDown />
            </Button>
          </div>
          <AddressLink
            address={data.contractAddress}
            name={data.name}
            slug={data.slug}
            className="hidden md:flex"
          />
        </div>
      </div>
      <AddressLink
        address={data.contractAddress}
        name={data.name}
        slug={data.slug}
        className={cn('md:hidden', showStatsInMobile ? 'flex' : 'hidden')}
      />
      <div
        className={cn(
          'flex items-center gap-2 md:gap-5',
          showStatsInMobile ? 'flex overflow-x-auto' : 'hidden md:flex',
        )}
      >
        <div className="flex flex-col gap-1 md:gap-2">
          <p className="text-xs md:text-sm text-muted-foreground">Floor</p>
          <PriceCell
            className="text-base md:text-xl font-bold"
            price={data.floorPrice?.toString()}
            symbol={data?.priceSymbol}
          />
        </div>
        {data.bestCollectionOffer?.hasBestCollectionOrder && (
          <div className="flex flex-col gap-1 md:gap-2">
            <p className="text-xs md:text-sm text-muted-foreground">
              Best Offer
            </p>
            <PriceCell
              className="text-base md:text-xl font-bold"
              price={data.bestCollectionOffer?.bestSeaportOrder?.perPrice?.toString()}
              symbol={data.bestCollectionOffer?.priceSymbol ?? 'WETH'}
            />
          </div>
        )}
        <div className="flex flex-col gap-1 md:gap-2">
          <p className="text-xs md:text-sm text-muted-foreground">24H Vol.</p>
          <UsdCell
            className="text-base md:text-xl font-bold"
            // @ts-ignore
            number={data.oneDayTradingVolume?.toString()}
          />
        </div>
        <div className="flex flex-col gap-1 md:gap-2">
          <p className="text-xs md:text-sm text-muted-foreground">Total Vol.</p>
          <UsdCell
            className="text-base md:text-xl font-bold"
            number={data.totalVolume?.toString()}
          />
        </div>
        <div className="flex flex-col gap-1 md:gap-2">
          <p className="text-xs md:text-sm text-muted-foreground">Listed</p>
          <PercentageCell
            className="text-base md:text-xl font-bold"
            // @ts-ignore
            percentage={(data.listingPercents * 100)?.toString()}
          />
        </div>
        <div className="flex flex-col gap-1 md:gap-2">
          <p className="text-xs md:text-sm text-muted-foreground">Owners</p>
          <NumberCell
            className="text-base md:text-xl font-bold"
            number={data.totalOwners?.toString()}
          />
        </div>
      </div>
    </div>
  );
};
