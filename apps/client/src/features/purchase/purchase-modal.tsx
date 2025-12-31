import { PriceCell } from '@/components/data-cells';
import { OrderDetails } from '@/components/order-details';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import useWalletBalances from '@/hooks/use-wallet-balances';
import { apiClient, lootex } from '@/lib/lootex';
import { tokens } from '@/lib/tokens';
import { summarizeOrders } from '@/utils/summarize-orders';
import { extractTransferedTokensFromLogs } from '@/utils/transaction';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAggregator } from '@lootex-core/sdk/aggregator';
import type { LootexOrder } from '@lootex-core/sdk/order';
import { AlertCircle, BadgeInfoIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useConnection } from 'wagmi';
import { useSelectionStore } from '../collection-browser/selection-store';
import { useSendTransaction } from '../wallet/use-send-transaction';
import { config } from '@/lib/config';

export const PurchaseModal = ({
  orders,
  isOpen,
  setIsOpen,
}: {
  orders?: LootexOrder[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) => {
  const { address,  chainId: connectionChainId } = useConnection();
  const account = address ? { address } : undefined;
  const [step, setStep] = useState<
    'validate' | 'confirm' | 'execute' | 'success'
  >('validate');
  const queryClient = useQueryClient();
  const [executeStep, setExecuteStep] = useState(1);
  const { toast } = useToast();
  const { removeItemsByOrderHashes } = useSelectionStore();
  const [successTokenIds, setSuccessTokenIds] = useState<string[]>([]);
  const { mutateAsync: sendTransactionAsync } = useSendTransaction();

  const { data: balances, isSuccess: isLoadBalancesSuccess } =
    useWalletBalances({
      enabled: isOpen && !!orders,
    });

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!account) {
        throw new Error('No account found');
      }

      if (!orders || orders.length === 0) {
        return {
          orders: [],
          validationResults: [],
        };
      }

      const chainId = orders[0].chainId;
      const aggregator = createAggregator({
        client: lootex,
      });

      // First check ownership for all orders
      const validationResults: ('owned' | 'pending' | 'valid' | 'invalid')[] =
        orders.map((order) =>
          order.offerer.toLowerCase() === account.address?.toLowerCase()
            ? 'owned'
            : 'pending',
        );

      // Get orders that need validation (not owned)
      const ordersToValidate = orders.filter(
        (_, index) => validationResults[index] === 'pending',
      );

      if (ordersToValidate.length > 0) {
        const validations = await aggregator.strictValidateOrders({
          chainId,
          orders: ordersToValidate,
        });

        // Update validation results for non-owned orders
        let validationIndex = 0;
        validationResults.forEach((result, index) => {
          if (result === 'pending') {
            validationResults[index] = validations[validationIndex].isValid
              ? 'valid'
              : 'invalid';
            validationIndex++;
          }
        });
      }

      return {
        orders,
        validationResults,
      };
    },
    onSuccess: async ({ orders, validationResults }) => {
      try {
        await Promise.all(
          validationResults.map(async (result, index) => {
            if (result === 'invalid') {
              await apiClient.misc.syncOrder({
                hash: orders[index].hash,
                chainId: orders[index].chainId,
                exchangeAddress: orders[index].exchangeAddress,
              });
            }
          }),
        );
      } catch (error) {
        console.error(error);
      }

      removeItemsByOrderHashes(
        validationResults
          .map((result, index) =>
            result === 'invalid' ? orders[index].hash : undefined,
          )
          .filter((hash) => hash !== undefined),
      );

      setStep('confirm');
    },
  });

  const validOrders = useMemo(() => {
    return validateMutation.data?.orders.filter(
      (order, index) =>
        validateMutation.data?.validationResults[index] === 'valid',
    );
  }, [validateMutation.data]);

  const prepareFulfillOrdersMutation = useMutation({
    mutationFn: async () => {
      

      if (!account) {
        throw new Error('No account found');
      }

      if (!validOrders || validOrders.length === 0) {
        throw new Error('No orders found');
      }

      const chainId = validOrders[0].chainId;

      if (connectionChainId !== chainId) {
        throw new Error('Please switch to the correct chain');
      }

      const aggregator = createAggregator({
        client: lootex,
      });

      const execution = await aggregator.fulfillOrders({
        chainId,
        orders: validOrders,
        accountAddress: account.address as `0x${string}`,
        isFullfillOffer: false,
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

  const approveAction = prepareFulfillOrdersMutation.data?.actions.filter(
    (action) => action.type === 'approve',
  )?.[0];

  const approveCurrency = useMemo(() => {
    return tokens.find((t) => t.address === approveAction?.token);
  }, [approveAction]);

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!approveAction) {
        throw new Error('No approve action found');
      }

      if (!validOrders || validOrders.length === 0) {
        throw new Error('No orders found');
      }

      const tx = await approveAction.buildTransaction();

      return await sendTransactionAsync(tx);
    },
    onSuccess: async () => {
      setExecuteStep(2);
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
      if (!account) {
        throw new Error('No account found');
      }

      if (!exchangeAction) {
        throw new Error('No exchange action found');
      }

      if (!validOrders || validOrders.length === 0) {
        throw new Error('No orders found');
      }

      const chainId = validOrders[0].chainId;

      const tx = await exchangeAction.buildTransaction();

      return await sendTransactionAsync(tx);
    },
    onSuccess: async (txReceipt) => {
      try {
        const res = await apiClient.request({
          method: 'PUT',
          path: `/v3/orders/sync/${validOrders?.[0].chainId}/${txReceipt.transactionHash}`,
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

      if (validOrders) {
        // Track purchase event
        const eventData = {
          number_of_items: validOrders.length,
          items: validOrders.map((order) => ({
            collection_slug: order.assets[0]?.collectionSlug,
            token_id: order.assets[0]?.assetTokenId,
            unit_price: Number(order.perPrice),
            currency: order.priceSymbol,
            quantity: 1,
          })),
          chain_id: validOrders[0].chainId,
          total_value: validOrders.reduce(
            (acc, order) => acc + Number(order.perPrice),
            0,
          ),
          wallet_address: account?.address,
        };
        removeItemsByOrderHashes(validOrders.map((order) => order.hash));
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

  const summary = useMemo(() => {
    return summarizeOrders(validOrders ?? []);
  }, [validOrders]);

  const hasSkippedItems = useMemo(() => {
    return validOrders?.length !== orders?.length;
  }, [validOrders, orders]);

  const insufficientFunds = useMemo(() => {
    if (
      !summary.currencyAmounts.length ||
      !isLoadBalancesSuccess ||
      !balances
    ) {
      return [];
    }

    return summary.currencyAmounts.reduce<any[]>((acc, currencyAmount) => {
      const requiredAmount = BigInt(currencyAmount.quotient());
      const balance = balances.find(
        (b) => b.token.symbol === currencyAmount.currency.symbol,
      );

      if (!balance || balance.raw < requiredAmount) {
        acc.push(
          balance ?? {
            raw: BigInt(0),
            decimals: 18,
            formatted: '0',
            symbol: 'Unknown',
          },
        );
      }

      return acc;
    }, []);
  }, [isLoadBalancesSuccess, balances, summary.currencyAmounts]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (isOpen && orders) {
      validateMutation.mutate();
      setStep('validate');
      setExecuteStep(1);
    }
  }, [isOpen, orders]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        {step === 'validate' && (
          <>
            <DialogHeader>
              <DialogTitle>Validating Listing</DialogTitle>
            </DialogHeader>
            <p>Checking your orders...</p>
          </>
        )}
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>Review Purchase Details</DialogTitle>
            </DialogHeader>
            {hasSkippedItems && (
              <Alert>
                <BadgeInfoIcon className="h-4 w-4" />
                <AlertTitle className="text-base">
                  <span className="font-bold">
                    {orders && validOrders
                      ? orders.length - validOrders.length
                      : 0}
                  </span>{' '}
                  items were skipped as they are unavailable or already owned by
                  you.
                </AlertTitle>
              </Alert>
            )}
            <OrderDetails
              items={summary.orders.map((order) => ({
                id: order.id,
                imageUrl: order.assets[0].assetImageUrl ?? '',
                price: order.perPrice?.toString() ?? '',
                symbol: order.priceSymbol,
                title: `#${order.assets[0].assetTokenId ?? ''}`,
                subtitle: order.assets[0].assetName ?? '',
                quantity: Number(
                  order.seaportOrder?.parameters.offer[0].endAmount,
                ),
              }))}
              isOpen={true}
            />

            <div className="flex flex-col gap-1">
              <div className="flex justify-between font-bold">
                <div>You will pay</div>
                <div className="flex flex-col gap-1 items-end">
                  {summary.currencyAmounts.map((currencyAmount) => (
                    <PriceCell
                      key={currencyAmount.currency.symbol}
                      exact
                      price={currencyAmount.toSignificant()}
                      symbol={currencyAmount.currency.symbol}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <div>+ Estimated Gas Fee</div>
                <PriceCell price="0.0000001" symbol="ETH" />
              </div>
            </div>
            {insufficientFunds.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-base font-semibold">
                  Not enough funds
                </AlertTitle>
                <AlertDescription className="text-sm">
                  Your balance{' '}
                  <span className="font-bold">
                    {insufficientFunds
                      .map((fund) => `${fund.formatted} ${fund.symbol}`)
                      .join(', ')}
                  </span>{' '}
                  is insufficient to complete this purchase or cover gas fees.
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                size="lg"
                onClick={() => prepareFulfillOrdersMutation.mutate()}
                isLoading={
                  validateMutation.isPending ||
                  prepareFulfillOrdersMutation.isPending
                }
                className="font-brand"
                disabled={
                  validateMutation.isPending ||
                  insufficientFunds.length > 0 ||
                  prepareFulfillOrdersMutation.isPending ||
                  validOrders?.length === 0
                }
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}
        {step === 'execute' && (
          <>
            <DialogHeader>
              <DialogTitle>Purchase Items</DialogTitle>
            </DialogHeader>
            <OrderDetails
              items={summary.orders.map((order) => ({
                id: order.id,
                imageUrl: order.assets[0].assetImageUrl ?? '',
                price: order.perPrice?.toString() ?? '',
                symbol: order.priceSymbol,
                title: `#${order.assets[0].assetTokenId}`,
                subtitle: order.assets[0].assetName,
                quantity: Number(
                  order.seaportOrder?.parameters.offer[0].endAmount,
                ),
              }))}
              isOpen={false}
            />
            <ProgressSteps currentStep={executeStep}>
              <ProgressStep title="Approve Currency">
                <p>
                  Approve {approveCurrency?.symbol} for purchases on{' '}
                  {config.appName} (one-time only)
                </p>
                <Button
                  onClick={() => approveMutation.mutate()}
                  size="lg"
                  isLoading={approveMutation.isPending}
                  className="font-brand"
                >
                  Approve
                </Button>
              </ProgressStep>
              <ProgressStep title="Purchase Items">
                <p>You'll only be charged for successful purchases</p>
                <Button
                  size="lg"
                  onClick={() => exchangeMutation.mutate()}
                  isLoading={exchangeMutation.isPending}
                  className="font-brand"
                >
                  Purchase
                </Button>
              </ProgressStep>
            </ProgressSteps>
          </>
        )}
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Purchase Completed Successfully</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-stretch gap-4">
              <p className="text-gray-600">
                Congratulations! You have successfully purchased{' '}
                <span className="font-bold">{successTokenIds?.length}</span>{' '}
                items.
              </p>
              <OrderDetails
                items={summary.orders
                  .filter((order) =>
                    successTokenIds.includes(
                      order?.assets[0]?.assetTokenId ?? '',
                    ),
                  )
                  .map((order) => ({
                    id: order.id,
                    imageUrl: order.assets[0].assetImageUrl ?? '',
                    price: order.perPrice?.toString() ?? '',
                    symbol: order.priceSymbol,
                    title: `#${order.assets[0].assetTokenId}`,
                    subtitle: order.assets[0].assetName,
                    quantity: Number(
                      order.seaportOrder?.parameters.offer[0].endAmount,
                    ),
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
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="font-brand"
              >
                Done
              </Button>
              <Link href={`/users/${account?.address}`}>
                <Button
                  size="lg"
                  className="font-brand"
                  asChild
                  onClick={() => setIsOpen(false)}
                >
                  View My Items
                </Button>
              </Link>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
