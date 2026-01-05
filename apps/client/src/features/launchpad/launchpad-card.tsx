import {
  CollectionCell,
  PriceCell,
  removeTrailingZeros,
} from '@/components/data-cells';
import { Image } from '@/components/image';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { LootexCollection } from '@/sdk/exports/collection';
import Link from 'next/link';

export const LaunchpadCard = ({
  slug,
  name,
  imageUrl,
  collection,
  price,
  symbol,
  percentage,
  isLive,
  isEnded,
  endedReason,
  tokenId,
}: {
  slug: string;
  name: string;
  imageUrl: string;
  collection: LootexCollection;
  price: string;
  symbol: string;
  percentage: number;
  isLive: boolean;
  isEnded: boolean;
  endedReason: string;
  tokenId?: string;
}) => {
  return (
    <Link
      href={
        tokenId !== undefined
          ? `/launchpad/${slug}/${tokenId}`
          : `/launchpad/${slug}`
      }
      className={cn(
        'flex flex-col overflow-hidden rounded-lg cursor-pointer group relative h-full border bg-white',
      )}
    >
      <div className="aspect-square relative overflow-hidden">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="w-full h-full hoverable-bg-image"
        />
      </div>

      <div className="flex flex-col gap-3 p-2 flex-1">
        <CollectionCell
          collection={collection}
          showLogo={false}
          titleComponent="h2"
          titleClassName="text-foreground font-bold"
        />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-1">
          <PriceCell price={price} exact symbol={symbol} />
          <span className="text-foreground text-sm">
            {removeTrailingZeros(percentage.toFixed(1))}% minted
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          {isLive ? (
            <Button className="flex-1 font-brand">Mint Now</Button>
          ) : isEnded ? (
            <Button className="flex-1 font-brand" variant="secondary" disabled>
              {endedReason}
            </Button>
          ) : (
            <Button className="flex-1 font-brand" variant="outline">
              Check Info
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
};

export const LaunchpadCardSkeleton = () => {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border cursor-pointer group relative h-full">
      <div className="aspect-square relative overflow-hidden">
        <Skeleton className="w-full h-full rounded-none" />
      </div>
      <div className="flex flex-col gap-3 p-2 flex-1">
        <Skeleton className="w-1/2 h-4" />
        <Skeleton className="w-1/2 h-4" />
        <Skeleton className="w-full h-9" />
      </div>
    </div>
  );
};
