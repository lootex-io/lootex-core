import { PriceCell } from '@/components/data-cells';
import { Image } from '@/components/image';
import { useModal } from '@/components/modal-manager';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Asset } from '@/sdk/exports/asset';
import { PlusIcon } from 'lucide-react';
import { CheckIcon } from 'lucide-react';
import { PurchaseButton } from '../purchase/purchase-button';

export const AssetCard = ({
  asset,
  isSelected,
  toggleItem,
  isOwner,
  isLoading,
  isToggleDisabled,
}: {
  asset?: Asset;
  isSelected?: boolean;
  toggleItem?: (asset: Asset) => void;
  isOwner?: boolean;
  isLoading?: boolean;
  isToggleDisabled?: boolean;
}) => {
  const { onOpen: onOpenAssetModal } = useModal('asset');
  const { onOpen: onOpenSellModal } = useModal('sell');

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border cursor-pointer group relative',
        isSelected && 'border-[#FFC64A] border-2',
      )}
      onClick={() => {
        if (asset) {
          onOpenAssetModal({
            asset,
          });
        }
      }}
      onKeyDown={(e) => {
        if (asset) {
          onOpenAssetModal({
            asset,
          });
        }
      }}
    >
      {isLoading || !asset ? (
        <div className="aspect-square relative overflow-hidden">
          <Skeleton className="w-full h-full rounded-none" />
        </div>
      ) : (
        <div className="aspect-square relative overflow-hidden">
          <Image
            src={asset.assetImageUrl}
            alt={asset.assetName}
            className="w-full h-full hoverable-bg-image"
          />
          <div
            className={cn(
              'absolute top-2 right-2 hidden',
              asset.order?.listing || isOwner ? 'md:block' : 'md:hidden',
            )}
          >
            <Button
              size="icon-sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                if (asset?.order?.listing || isOwner) {
                  toggleItem?.(asset);
                }
              }}
              className={cn(
                'hidden group-hover:inline-flex bg-muted/90',
                isSelected && 'inline-flex bg-[#FFC64A] hover:bg-[#FFC64A]',
              )}
              disabled={isToggleDisabled}
            >
              {isSelected ? <CheckIcon /> : <PlusIcon />}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 p-2">
        {isLoading ? (
          <Skeleton className="h-[14px] w-[60px]" />
        ) : (
          <span className="text-foreground text-sm font-bold">
            #{asset?.assetTokenId}
          </span>
        )}
        {(isLoading && <Skeleton className="w-full h-9" />) ||
          (asset?.order?.listing && (
            <div className="flex items-center gap-2">
              {isOwner ? (
                <PriceCell
                  price={asset.order.listing?.price?.toString() ?? '0'}
                  symbol={asset.order.listing.priceSymbol}
                />
              ) : (
                <PurchaseButton
                  orderHash={asset.order.listing.hash}
                  price={asset.order.listing?.price?.toString() ?? '0'}
                  priceSymbol={asset.order.listing.priceSymbol}
                  className="flex-1"
                />
              )}
            </div>
          )) ||
          (isOwner ? (
            <Button
              className="font-brand"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSellModal({
                  assets: [asset],
                });
              }}
            >
              List Now
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground opacity-[0.75] flex items-center h-9">
              Not for sale
            </span>
          ))}
      </div>
    </div>
  );
};
