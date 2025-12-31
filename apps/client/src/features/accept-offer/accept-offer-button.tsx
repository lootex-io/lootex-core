import { useModal } from '@/components/modal-manager';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/lootex';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import type { Asset } from '@lootex-core/sdk/asset';
import { useConnection } from 'wagmi';

export const AcceptOfferButton = ({
  orderHash,
  className,
  size,
  asset,
  children = 'Accept Offer',
}: {
  orderHash: `0x${string}`;
  className?: string;
  size?: ButtonProps['size'];
  asset?: Asset;
  children?: React.ReactNode;
}) => {
  const { address } = useConnection();
  const account = address ? { address } : undefined;
  const { toast } = useToast();
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const data = await apiClient.orders.getOrders({
        hash: orderHash,
        limit: 1,
        page: 1,
      });
      const fullOrder = data.orders[0];

      if (!fullOrder) {
        throw new Error('Order not found');
      }

      if (fullOrder.offerer.toLowerCase() === account?.address?.toLowerCase()) {
        throw new Error('You cannot purchase your own order');
      }

      return fullOrder;
    },
    onSuccess: (order) => {
      onOpenAcceptOfferModal({ order, ...(asset ? { assets: [asset] } : {}) });
    },
    onError: (error) => {
      toast({
        title: 'Unable to purchase',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const { onOpen: onOpenAcceptOfferModal } = useModal('acceptOffer');
  const authGuard = useAuthGuard();

  return (
    <Button
      variant="secondary"
      onClick={(e) => {
        e.stopPropagation();
        authGuard(() => {
          mutate();
        });
      }}
      disabled={isPending}
      className={cn(className)}
      isLoading={isPending}
      size={size}
    >
      {children}
    </Button>
  );
};
