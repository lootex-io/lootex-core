import { PriceCell } from '@/components/data-cells';
import { useModal } from '@/components/modal-manager';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/lootex';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import { SparkleIcon } from 'lucide-react';
import { useConnection } from 'wagmi';

export const PurchaseButton = ({
  orderHash,
  price,
  priceSymbol,
  className,
  size,
}: {
  orderHash: `0x${string}`;
  price: string;
  priceSymbol: string;
  className?: string;
  size?: ButtonProps['size'];
}) => {
  const { address } = useConnection();
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

      if (fullOrder.offerer.toLowerCase() === address?.toLowerCase()) {
        throw new Error('You cannot purchase your own order');
      }

      return fullOrder;
    },
    onSuccess: (order) => {
      onOpenPurchaseModal({ orders: [order] });
    },
    onError: (error) => {
      toast({
        title: 'Unable to purchase',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const { onOpen: onOpenPurchaseModal } = useModal('purchase');
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
      <PriceCell price={price?.toString() ?? '0'} symbol={priceSymbol} />
      <SparkleIcon className="w-4 h-4" />
    </Button>
  );
};
