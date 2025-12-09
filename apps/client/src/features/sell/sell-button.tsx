import { useModal } from '@/components/modal-manager';
import { Button } from '@/components/ui/button';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { cn } from '@/lib/utils';
import type { Asset } from 'lootex/asset';

export const SellButton = ({
  asset,
  className,
}: {
  asset: Asset;
  className?: string;
}) => {
  const { onOpen: onOpenSellModal } = useModal('sell');
  const authGuard = useAuthGuard();

  return (
    <Button
      variant="secondary"
      onClick={(e) => {
        e.stopPropagation();
        authGuard(() => {
          onOpenSellModal({ assets: [asset] });
        });
      }}
      size="sm"
      className={cn(className)}
    >
      List
    </Button>
  );
};
