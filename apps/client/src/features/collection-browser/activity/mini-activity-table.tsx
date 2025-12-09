import { PriceCell } from '@/components/data-cells';
import { Image } from '@/components/image';
import { useModal } from '@/components/modal-manager';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/format';
import type { OrderHistory } from 'lootex/api/endpoints/order';
import { ArrowRightIcon } from 'lucide-react';

export const MiniActivityTable = ({
  data,
  className,
  children,
  isLoading,
}: {
  data: OrderHistory[];
  className?: string;
  children?: React.ReactNode;
  isLoading?: boolean;
}) => {
  const { onOpen: openAssetModal } = useModal('asset');

  return (
    <div className={cn('flex flex-col', className)}>
      {isLoading &&
        Array.from({ length: 10 }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          <div key={index} className="flex items-center gap-2 py-2 px-3">
            <Skeleton className="w-9 h-9 rounded" />
            <div className="flex flex-col gap-1 flex-grow min-w-0">
              <Skeleton className="w-20 h-4" />
              <Skeleton className="w-12 h-3" />
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0 items-end">
              <Skeleton className="w-16 h-4" />
              <Skeleton className="w-10 h-3" />
            </div>
          </div>
        ))}
      {data.map((item) => {
        const assetId = `${item.collectionChainShortName}/${item.contractAddress}/${item.tokenId}`;
        const isCollectionOffer = item.category === 'collection_offer';
        const handleOpenAssetModal = () => {
          if (isCollectionOffer) {
            return;
          }

          openAssetModal({
            assetId,
            asset: undefined,
            collectionSlug: item.collectionSlug,
          });
        };

        return (
          <button
            type="button"
            key={item.id}
            className={cn(
              'flex items-center gap-2 py-2 px-3 cursor-pointer w-full text-left hover:bg-muted',
              isCollectionOffer && 'cursor-not-allowed',
            )}
            onClick={handleOpenAssetModal}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handleOpenAssetModal();
              }
            }}
          >
            <div className="flex-shrink-0">
              <Image
                src={item.assetImageUrl ?? item.collectionLogoImageUrl}
                alt={item.assetName}
                className="w-9 h-9 rounded"
              />
            </div>
            <div className="flex flex-col gap-1 flex-grow min-w-0">
              <div className="flex items-center gap-1 text-sm font-bold">
                <span className="capitalize">
                  {item.category === 'collection_offer'
                    ? 'Collection offer'
                    : item.category}
                </span>
                <span className="text-sm text-muted-foreground">
                  {item.category === 'collection_offer'
                    ? ''
                    : `#${item.tokenId}`}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {item.fromAddress && item.toAddress ? (
                  <span className="flex items-center gap-1">
                    <span className="text-muted-foreground">
                      {item.fromAddress.slice(0, 6)}
                    </span>
                    <ArrowRightIcon className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {item.toAddress.slice(0, 6)}
                    </span>
                  </span>
                ) : item.fromAddress ? (
                  `${item.fromAddress.slice(0, 6)}`
                ) : item.toAddress ? (
                  `${item.toAddress.slice(0, 6)}`
                ) : (
                  '--'
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0 text-right items-end">
              <PriceCell
                price={item.perPrice?.toString() ?? ''}
                symbol={item.currencySymbol}
                className="text-sm"
              />
              <span className="text-xs text-muted-foreground font-normal">
                {formatRelativeTime(item.updatedAt)}
              </span>
            </div>
          </button>
        );
      })}
      {children}
    </div>
  );
};
