import { OrderDetails } from '@/components/order-details';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProgressStep, ProgressSteps } from '@/components/ui/progress-steps';
import { ViewTransactionLink } from '@/components/view-transaction-link';
import { useToast } from '@/hooks/use-toast';
import { apiClient, lootex } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { extractTransferedTokensFromLogs } from '@/utils/transaction';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAggregator } from 'lootex/aggregator';
import type { Asset } from 'lootex/asset';
import type { LootexOrder } from 'lootex/order';
import { useEffect, useState } from 'react';
import { useConnection } from 'wagmi';
import { useSelectionStore } from '../collection-browser/selection-store';
import { useSendTransaction } from '../wallet/use-send-transaction';
import { ReviewItemsStep } from './review-items-step';
import { SelectItemsStep } from './select-items-step';

export const AcceptOfferModal = ({
  order,
  assets: initialAssets,
  isOpen,
  setIsOpen,
}: {
  order?: LootexOrder;
  assets?: Asset[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) => {
  const { address } = useConnection();
  const account = address ? { address } : undefined;
  const [step, setStep] = useState<
    'validate' | 'select' | 'confirm' | 'execute' | 'success'
  >('validate');
  const queryClient = useQueryClient();
  const [executeStep, setExecuteStep] = useState(1);
  const [assets, setAssets] = useState<Asset[]>(initialAssets ?? []);
  const [completedApprovals, setCompletedApprovals] = useState(0);

  const { toast } = useToast();
  const { removeItemsByOrderHashes } = useSelectionStore();
  const [successTokenIds, setSuccessTokenIds] = useState<string[]>([]);
  const { mutateAsync: sendTransactionAsync } = useSendTransaction();
  const isCollectionOffer = !!(
    order?.category === 'offer' && order?.offerType === 'Collection'
  );

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!account) {
        throw new Error('No account found');
      }

      if (!order) {
        return {
          order: undefined,
          validationResult: 'invalid' as const,
        };
      }

      const chainId = order.chainId;
      const aggregator = createAggregator({
        client: lootex,
      });

      // First check if order is owned by the user
      if (order.offerer.toLowerCase() === account.address?.toLowerCase()) {
        return {
          order,
          validationResult: 'owned' as const,
        };
      }

      const validations = await aggregator.strictValidateOrders({
        chainId,
        orders: [order],
      });

      return {
        order,
        validationResult: validations[0].isValid
          ? ('valid' as const)
          : ('invalid' as const),
      };
    },
    onSuccess: async ({ order, validationResult }) => {
      try {
        if (validationResult === 'invalid' && order) {
          await apiClient.misc.syncOrder({
            hash: order.hash,
            chainId: order.chainId,
            exchangeAddress: order.exchangeAddress,
          });
          removeItemsByOrderHashes([order.hash]);
          toast({
            title: 'Offer is no longer available',
            description: 'This offer has expired or is no longer valid.',
            variant: 'destructive',
          });
          queryClient.invalidateQueries({ queryKey: ['offers'] });
          setIsOpen(false);
        } else if (validationResult === 'owned') {
          toast({
            title: 'Cannot accept your own offer',
            description: 'You cannot accept an offer that you created.',
            variant: 'destructive',
          });
          setIsOpen(false);
        } else {
          if (isCollectionOffer && !initialAssets) {
            setAssets([]);
            setStep('select');
          } else {
            setAssets(initialAssets ?? []);
            setStep('confirm');
          }
        }
      } catch (error) {
        console.error(error);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsOpen(false);
    },
  });

  useEffect(() => {
    if (isOpen && order) {
      validateMutation.mutate();
      setStep('validate');
      setExecuteStep(1);
      setCompletedApprovals(0);
    }
  }, [isOpen, order, validateMutation.mutate]);

  useEffect(() => {
    if (initialAssets) {
      setAssets(initialAssets);
    }
  }, [initialAssets]);

  const prepareFulfillOrdersMutation = useMutation({
    mutationFn: async ({ offers }: { offers: { quantity?: string }[] }) => {
      if (!account) {
        throw new Error('No account found');
      }

      if (!order) {
        throw new Error('No orders found');
      }

      if (!assets.length && !isCollectionOffer) {
        throw new Error('No asset found');
      }

      const chainId = order.chainId;

      const aggregator = createAggregator({
        client: lootex,
      });

      const augmentedOrders = assets.map((asset, index) => ({
        ...order,
        unitsToFill: BigInt(offers[index].quantity ?? 1),
        ...(isCollectionOffer
          ? {
              considerationCriteria: [
                { identifier: asset.assetTokenId, proof: [] },
              ],
            }
          : {}),
      }));

      const execution = await aggregator.fulfillOrders({
        chainId,
        orders: augmentedOrders,
        accountAddress: account.address as `0x${string}`,
        isFullfillOffer: true,
      });

      return execution;
    },
    onSuccess: (execution) => {
      if (
        execution.actions.filter((action) => action.type === 'approve')
          .length === 0
      ) {
        setExecuteStep(2);
      } else {
        setExecuteStep(1);
      }
      setStep('execute');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const approveActions = prepareFulfillOrdersMutation.data?.actions.filter(
    (action) => action.type === 'approve',
  );

  const approveMutation = useMutation({
    mutationFn: async () => {
      const approveAction = approveActions?.[completedApprovals];
      if (!approveAction) {
        throw new Error('No approve action found');
      }

      if (!account) {
        throw new Error('No account found');
      }

      if (!order) {
        throw new Error('No orders found');
      }

      const tx = await approveAction.buildTransaction();

      return await sendTransactionAsync(tx);
    },
    onSuccess: async () => {
      if (completedApprovals + 1 === approveActions?.length) {
        setExecuteStep(2);
      } else {
        setCompletedApprovals(completedApprovals + 1);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const exchangeAction = prepareFulfillOrdersMutation.data?.actions.filter(
    (action) => action.type === 'exchange',
  )?.[0];

  const exchangeMutation = useMutation({
    mutationFn: async () => {
      if (!exchangeAction) {
        throw new Error('No exchange action found');
      }

      if (!order) {
        throw new Error('No orders found');
      }

      const tx = await exchangeAction.buildTransaction();

      return await sendTransactionAsync(tx);
    },
    onSuccess: async (txReceipt) => {
      try {
        const res = await apiClient.request({
          method: 'PUT',
          path: `/v3/orders/sync/${order?.chainId ?? defaultChain.id}/${
            txReceipt.transactionHash
          }`,
        });

        const tokenIds = extractTransferedTokensFromLogs(res as string[]);
        setSuccessTokenIds(tokenIds);
      } catch (error) {
        console.error(error);
      }

      setStep('success');

      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['nfts'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['offers-received'] });
      queryClient.invalidateQueries({ queryKey: ['instant-sell-items'] });
      queryClient.invalidateQueries({ queryKey: ['order', order?.hash] });

      if (order && assets.length > 0) {
        // Track accept offer event
        const eventData = {
          number_of_items: assets.length,
          items: assets.map((asset) => ({
            collection_slug: asset.collectionSlug,
            token_id: asset.assetTokenId,
            unit_price: Number(order.perPrice),
            quantity: 1,
          })),
          chain_id: order.chainId,
          total_value: Number(order.perPrice) * assets.length,
          currency: order.priceSymbol,
          wallet_address: account?.address,
          offer_type:
            order.offerType?.toLowerCase() === 'collection'
              ? 'collection_offer'
              : 'offer',
        };
        removeItemsByOrderHashes([order.hash]);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (!order) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        {step === 'validate' && (
          <>
            <DialogHeader>
              <DialogTitle>Validating Offer</DialogTitle>
            </DialogHeader>
            <p>Checking your orders...</p>
          </>
        )}
        {step === 'select' && (
          <SelectItemsStep
            order={order}
            onSubmit={(selectedAssets) => {
              setAssets(selectedAssets);
              setStep('confirm');
            }}
          />
        )}
        {step === 'confirm' && (
          <ReviewItemsStep
            order={order}
            assets={assets}
            onSubmit={({ offers }) => {
              prepareFulfillOrdersMutation.mutate({ offers });
            }}
            isPending={prepareFulfillOrdersMutation.isPending}
          />
        )}
        {step === 'execute' && (
          <>
            <DialogHeader>
              <DialogTitle>Accept Offer</DialogTitle>
            </DialogHeader>
            <OrderDetails
              items={assets.map((asset) => ({
                id: asset.id,
                imageUrl: asset.assetImageUrl,
                price: order?.perPrice?.toString() ?? '',
                symbol: order?.priceSymbol ?? '',
                title: `#${asset.assetTokenId}`,
                subtitle: asset.assetName,
              }))}
              isOpen={false}
            />
            <ProgressSteps currentStep={executeStep}>
              <ProgressStep title="Approve Collection">
                <p>
                  Approve{' '}
                  <span className="font-bold">{assets[0]?.collectionName}</span>{' '}
                  for selling on Biru (one-time only)
                </p>
                <Button
                  onClick={() => approveMutation.mutate()}
                  size="lg"
                  isLoading={approveMutation.isPending}
                  disabled={approveMutation.isPending}
                  className="font-brand"
                >
                  Approve ({completedApprovals + 1} / {approveActions?.length})
                </Button>
              </ProgressStep>
              <ProgressStep title="Accept Offer">
                <p>
                  You will sell the items to the offerer if they have sufficient
                  funds.
                </p>
                <Button
                  size="lg"
                  onClick={() => exchangeMutation.mutate()}
                  isLoading={exchangeMutation.isPending}
                  disabled={exchangeMutation.isPending}
                  className="font-brand"
                >
                  Accept Offer
                </Button>
              </ProgressStep>
            </ProgressSteps>
          </>
        )}
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Offer Accepted Successfully</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-stretch gap-4">
              <p className="text-gray-600">
                Congratulations! You have successfully accepted the offer.
              </p>
              <OrderDetails
                items={assets
                  .filter((asset) =>
                    successTokenIds.includes(asset.assetTokenId),
                  )
                  .map((asset) => ({
                    id: asset.id,
                    imageUrl: asset.assetImageUrl,
                    price: order?.perPrice?.toString() ?? '',
                    symbol: order?.priceSymbol ?? '',
                    title: `#${asset.assetTokenId}`,
                    subtitle: asset.assetName,
                  }))}
                isOpen={true}
              />
              <ViewTransactionLink
                txHash={exchangeMutation.data?.transactionHash}
              />
            </div>
            <DialogFooter>
              <Button
                size="lg"
                onClick={() => setIsOpen(false)}
                className="font-brand"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
