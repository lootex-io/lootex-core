import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { lootex } from '@/lib/lootex';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAggregator } from '@/sdk/exports/aggregator';
import type { LootexOrder } from '@/sdk/exports/order';
import { useSendTransaction } from '../wallet/use-send-transaction';

export const CancelListingModal = ({
  orders,
  category = 'listing',
  isOpen,
  setIsOpen,
}: {
  orders?: LootexOrder[];
  category?: 'listing' | 'offer';
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) => {
  const { toast } = useToast();

  const aggregator = createAggregator({
    client: lootex,
  });

  const queryClient = useQueryClient();
  const { mutateAsync: sendTransactionAsync } = useSendTransaction();

  const cancelListingMutation = useMutation({
    mutationFn: async () => {
      if (!orders) {
        throw new Error('No orders provided');
      }

      const execution = await aggregator.cancelOrders({
        orders,
        chainId: orders[0].chainId,
      });

      const tx = await execution.actions[0].buildTransaction();

      const txReceipt = await sendTransactionAsync({
        to: tx.to,
        data: tx.data,
      });

      return { txReceipt, syncTxHashes: execution.syncTxHashes };
    },
    onSuccess: async ({ txReceipt, syncTxHashes }) => {
      setIsOpen(false);

      try {
        await syncTxHashes([txReceipt.transactionHash]);
      } catch (error) {
        console.error(error);
      }
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['nfts'] });
      queryClient.invalidateQueries({ queryKey: ['asset-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['offers-made'] });
      queryClient.invalidateQueries({ queryKey: ['offers-received'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel {category}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-start gap-4">
          <p className="text-gray-600">
            Are you sure you want to cancel the {category}?
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => cancelListingMutation.mutate()}
            isLoading={cancelListingMutation.isPending}
            className="font-brand"
          >
            Cancel {category}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
