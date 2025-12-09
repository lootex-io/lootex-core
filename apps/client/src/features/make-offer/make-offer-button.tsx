import { useModal } from '@/components/modal-manager';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { cn } from '@/lib/utils';
import type { Asset } from 'lootex/asset';
import type { LootexCollection } from 'lootex/collection';
import { LayersIcon } from 'lucide-react';

export const MakeOfferButton = ({
  asset,
  collection,
  className,
  iconOnly = false,
  ...props
}: ButtonProps & {
  asset?: Asset;
  collection?: LootexCollection;
  iconOnly?: boolean;
}) => {
  const { onOpen: onOpenMakeOfferModal } = useModal('makeOffer');
  const authGuard = useAuthGuard();

  return (
    <Button
      variant="secondary"
      onClick={(e) => {
        e.stopPropagation();
        authGuard(() => {
          onOpenMakeOfferModal({ asset, collection });
        });
      }}
      {...props}
      className={cn(className)}
    >
      {collection && <LayersIcon className="w-4 h-4" />}
      {!iconOnly && 'Make Offer'}
    </Button>
  );
};
