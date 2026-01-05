import { ItemCell, PriceCell } from '@/components/data-cells';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ProgressStep, ProgressSteps } from '@/components/ui/progress-steps';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

import { lootex } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAggregator } from '@/sdk/exports/aggregator';
import type { Asset } from '@/sdk/exports/asset';
import { getChain } from '@/sdk/exports/chains';
import type { LootexCollection } from '@/sdk/exports/collection';
import { SERVICE_FEE_ADDRESS } from '@/sdk/exports/order';
import type { LootexOrder } from '@/sdk/exports/order';
import { WETH9 } from '@/sdk/exports/token';
import { CurrencyAmount, Fraction } from '@/sdk/exports/utils';
import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { parseErc6492Signature, formatUnits } from 'viem';
import { useConnection, useBalance, useWalletClient, useChainId } from 'wagmi';
import { z } from 'zod';
import { useSelectionStore } from '../collection-browser/selection-store';
import { SwapButton } from '../swap/swap-button';
import { useSendTransaction } from '../wallet/use-send-transaction';
import { config } from '@/lib/config';

const durationOptions = [
  { id: '24_HOURS', value: 1000 * 60 * 60 * 24 * 1, label: '24H' },
  { id: '7_DAYS', value: 1000 * 60 * 60 * 24 * 7, label: '7 Days' },
  { id: '30_DAYS', value: 1000 * 60 * 60 * 24 * 30, label: '30 Days' },
  { id: '90_DAYS', value: 1000 * 60 * 60 * 24 * 90, label: '90 Days' },
  { id: '120_DAYS', value: 1000 * 60 * 60 * 24 * 120, label: '120 Days' },
];

const formSchema = z.object({
  duration: z.string(),
  quantity: z.string(),
  unitPrice: z.string().pipe(z.coerce.number().gt(0).max(100000)),
});

export const MakeOfferModal = ({
  asset,
  collection,
  isOpen,
  setIsOpen,
}: {
  asset?: Asset;
  collection?: LootexCollection;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) => {
  const isCollectionOffer = !!collection;
  const itemTitle = isCollectionOffer
    ? collection?.name
    : `#${asset?.assetTokenId}`;
  const itemSubtitle = isCollectionOffer ? undefined : asset?.collectionName;

  const itemImageUrl = isCollectionOffer
    ? collection?.logoImageUrl
    : asset?.assetImageUrl;

  const { address, chainId: connectionChainId } = useConnection();
  const { data: walletClient } = useWalletClient();
  const account = address ? { address } : undefined;
  const queryClient = useQueryClient();
  const chain = getChain(
    asset?.collectionChainShortName ??
      asset?.contractChainId ??
      defaultChain.id,
  );
  const chainId = chain?.id;
  const contractType = isCollectionOffer
    ? collection.contractType
    : asset?.contractType;

  const [step, setStep] = useState<'confirm' | 'execute' | 'success'>(
    'execute',
  );
  const selectionStore = useSelectionStore();
  const { mutateAsync: sendTransactionAsync } = useSendTransaction();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      duration: durationOptions[2].value.toString(),
      quantity: '1',
    },
  });

  const { quantity, unitPrice } = form.watch();

  const slug = asset?.collectionSlug ?? collection?.slug;
  const defaultCurrency = WETH9[chainId ?? defaultChain.id];
  const currency = defaultCurrency;

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (isOpen) {
      form.reset({
        duration: durationOptions[2].value.toString(),
        quantity: '1',
        unitPrice: undefined,
      });
    }
  }, [isOpen, asset]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    prepareCreateOrdersMutation.mutate();
  };

  const [executeStep, setExecuteStep] = useState(1);
  const { toast } = useToast();

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setExecuteStep(1);
      form.reset();
    }
  }, [isOpen]);

  const prepareCreateOrdersMutation = useMutation({
    mutationFn: async () => {
      console.log('prepareCreateOrdersMutation');
      console.log('account', account)
      console.log('walletClient', walletClient)
      console.log('chainId', chainId)
      console.log('connectionChainId', connectionChainId)

      if (connectionChainId !== chainId) {
        throw new Error('Please switch to the correct chain');
      }
      
      if (!account || !walletClient) {
        throw new Error('No account found');
      }

      if (!isCollectionOffer && !asset) {
        throw new Error('No asset found');
      }

      if (isCollectionOffer && !collection) {
        throw new Error('No collection found');
      }

      if (!contractType || !['ERC721', 'ERC1155'].includes(contractType)) {
        throw new Error('Invalid contract type');
      }

      if (!chainId) {
        throw new Error('No chain id found');
      }

      const aggregator = createAggregator({
        client: lootex,
      });

      const quantity = form.getValues('quantity');
      const unitPrice = form.getValues('unitPrice');

      const execution = await aggregator.createOrders({
        chainId,
        orders: [
          {
            tokenAddress: isCollectionOffer
              ? collection?.contractAddress
              : (asset?.contractAddress as `0x${string}`),
            quantity: quantity,
            tokenId: isCollectionOffer ? '0' : (asset?.assetTokenId as string),
            unitPrice: CurrencyAmount.fromFormattedAmount(currency, unitPrice),
            duration: new Date(
              Date.now() + Number.parseInt(form.getValues('duration')),
            ),
            tokenType: contractType,
            orderType: isCollectionOffer ? 'COLLECTION_OFFER' : 'OFFER',
            fees: [
              {
                recipient: SERVICE_FEE_ADDRESS,
                percentage: 2,
              },
              ...(collection?.creatorFee && collection?.creatorFeeAddress
                ? [
                    {
                      recipient: collection.creatorFeeAddress as `0x${string}`,
                      percentage: Number(collection.creatorFee),
                    },
                  ]
                : []),
            ],
          },
        ],
        accountAddress: account.address as `0x${string}`,
        walletClient,
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

  const approveActions = prepareCreateOrdersMutation.data?.actions.filter(
    (action) => action.type === 'approve',
  );

  const createOrdersAction = prepareCreateOrdersMutation.data?.actions.filter(
    (action) => action.type === 'create',
  )?.[0];

  const approveMutation = useMutation({
    mutationFn: async () => {
      const approveAction = approveActions?.[completedApprovals];

      if (!approveAction) {
        throw new Error('No approve action found');
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

  const createOrdersMutation = useMutation({
    mutationFn: async () => {
      if (!account) {
        throw new Error('No account found');
      }

      if (!createOrdersAction) {
        throw new Error('No create orders action found');
      }

      const result = await createOrdersAction.createOrders({
        createOrdersOnOrderbook: true,
        encodeSignature: (signature) =>
          parseErc6492Signature(signature).signature,
      });

      return result;
    },
    onSuccess: async (result) => {
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['nfts'] });
      queryClient.invalidateQueries({ queryKey: ['asset-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['offers-made'] });
      queryClient.invalidateQueries({ queryKey: ['offers-received'] });
      selectionStore.clear();

      // Track offer event
      if (result.lootexOrders) {
        const eventData = {
          number_of_items: result.lootexOrders.length,
          items: result.lootexOrders.map((order) => ({
            collection_slug:
              order.assets?.[0]?.collectionSlug ?? order.collections?.[0]?.slug,
            token_id: order.assets?.[0]?.assetTokenId ?? 'collection_offer',
            unit_price: Number(order.perPrice),
            currency: order.priceSymbol,
            quantity: Number(form.getValues('quantity')),
          })),
          chain_id: chainId,
          total_value: result.lootexOrders.reduce(
            (acc: number, order: LootexOrder) =>
              acc + Number(order.perPrice) * Number(form.getValues('quantity')),
            0,
          ),
          duration: form.getValues('duration'),
          wallet_address: account?.address,
          offer_type: isCollectionOffer ? 'collection_offer' : 'offer',
        };
      }

      return result;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const priceBreakdown = useMemo(() => {
    try {
      if (!chainId) {
        throw new Error('No chain id found');
      }

      const totalPrice = CurrencyAmount.fromFormattedAmount(
        currency,
        unitPrice || '0',
      ).multiply(quantity);

      const serviceFee = totalPrice.multiply(new Fraction(2, 100));
      const revenue = totalPrice.subtract(serviceFee);

      return {
        totalPrice,
        serviceFee,
        revenue,
      };
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }, [unitPrice, quantity, chainId]);

  const [completedApprovals, setCompletedApprovals] = useState(0);

  const { data: balance, isSuccess: isLoadBalanceSuccess } = useBalance({
    address: account?.address as `0x${string}`,
    ...(currency.address.toLowerCase() !==
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' && {
      token: currency.address.toLowerCase() as `0x${string}`,
    }),
    chainId: chainId ?? defaultChain.id,
  });

  const insufficientFunds = useMemo(() => {
    try {
      if (!priceBreakdown) return false;
      if (!isLoadBalanceSuccess) return false;

      return balance.value < BigInt(priceBreakdown.totalPrice.quotient());
    } catch (error) {
      return false;
    }
  }, [isLoadBalanceSuccess, balance, priceBreakdown]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>
                Make {isCollectionOffer ? 'Collection ' : ''}Offer
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col items-stretch gap-3 max-h-[240px] py-2">
                  <ItemCell
                    imageUrl={itemImageUrl ?? ''}
                    title={itemTitle}
                    subtitle={itemSubtitle}
                  />
                  <div className="flex items-center gap-2">
                    <Controller
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem className="max-w-[100px] flex-1">
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                placeholder="Enter quantity"
                                {...field}
                                type="number"
                                disabled={
                                  !(
                                    isCollectionOffer ||
                                    contractType === 'ERC1155'
                                  )
                                }
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="unitPrice"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Unit Price</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                placeholder="Enter offer price"
                                {...field}
                                type="number"
                              />
                              <span className="text-base text-muted-foreground">
                                {currency.symbol}
                              </span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                {priceBreakdown && (
                  <div className="flex flex-col gap-2">
                    <Separator />
                    <div className="flex justify-between items-center">
                      <div className="text-muted-foreground text-sm">
                        Duration
                      </div>
                      <div className="flex items-center gap-1">
                        <FormField
                          control={form.control}
                          name="duration"
                          render={({ field }) => (
                            <FormItem className="flex gap-2">
                              <div className="flex items-center gap-2">
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="text-sm h-8 py-1 w-[120px]">
                                      <SelectValue placeholder="Expiration in" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {durationOptions.map((option) => (
                                      <SelectItem
                                        key={option.id}
                                        value={option.value.toString()}
                                      >
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {/* <FormDescription>
                                Expire after{' '}
                                {new Date(
                                  Date.now() +
                                    Number.parseInt(form.getValues('duration'))
                                ).toLocaleString('en-US', {
                                  timeStyle: 'short',
                                  dateStyle: 'medium',
                                })}
                              </FormDescription> */}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="font-bold flex items-center gap-1">
                        Total price
                      </div>
                      <PriceCell
                        price={priceBreakdown.totalPrice.toFixed(18)}
                        symbol={currency.symbol}
                        exact
                      />
                    </div>
                  </div>
                )}
                {insufficientFunds && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="text-base font-semibold">
                      Insufficient funds
                    </AlertTitle>
                    <AlertDescription className="text-sm flex flex-col gap-2">
                      <span>
                        Your balance{' '}
                        <span className="font-bold">
                          {balance
                            ? formatUnits(balance.value, balance.decimals)
                            : '0'}{' '}
                          {currency.symbol}
                        </span>{' '}
                        is insufficient to make this offer.
                      </span>
                      <SwapButton
                        fromToken="ETH"
                        toToken={currency.symbol}
                        type="button"
                        className="self-start"
                      >
                        Convert ETH to {currency.symbol}
                      </SwapButton>
                    </AlertDescription>
                  </Alert>
                )}

                <DialogFooter>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={
                      !form.formState.isValid ||
                      insufficientFunds ||
                      prepareCreateOrdersMutation.isPending
                    }
                    isLoading={prepareCreateOrdersMutation.isPending}
                    className="font-brand"
                  >
                    Continue
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
        {step === 'execute' && (
          <>
            <DialogHeader>
              <DialogTitle>Submit Offer</DialogTitle>
            </DialogHeader>

            <ProgressSteps currentStep={executeStep}>
              <ProgressStep title={`Approve ${currency.symbol}`}>
                <p>
                  Approve {currency.symbol} for making offers on{' '}
                  {config.appName} (one-time only)
                </p>
                <Button
                  onClick={() => approveMutation.mutate()}
                  size="lg"
                  disabled={approveMutation.isPending}
                  isLoading={approveMutation.isPending}
                  className="font-brand"
                >
                  Approve ({completedApprovals + 1} / {approveActions?.length})
                </Button>
              </ProgressStep>
              <ProgressStep title="Sign Offers">
                <p>Sign with your wallet to confirm the offers</p>
                <Button
                  size="lg"
                  onClick={() => createOrdersMutation.mutate()}
                  disabled={createOrdersMutation.isPending}
                  isLoading={createOrdersMutation.isPending}
                  className="font-brand"
                >
                  Sign Offers
                </Button>
              </ProgressStep>
            </ProgressSteps>
          </>
        )}
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Offer Created Successfully</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-stretch gap-4">
              <p className="text-gray-600">
                Congratulations! You have successfully made the offer.
              </p>
              <OrderDetails
                items={createOrdersMutation.data?.lootexOrders?.map(
                  (order) => ({
                    imageUrl:
                      order.assets?.[0]?.assetImageUrl ??
                      order.collections?.[0]?.logoImageUrl,
                    price: order.perPrice.toString(),
                    symbol: order.priceSymbol,
                    quantity: Number(
                      order.seaportOrder?.parameters.consideration[0].endAmount,
                    ),
                    title: isCollectionOffer
                      ? order.collections?.[0]?.name
                      : `#${order.assets?.[0]?.assetTokenId}`,
                    subtitle: !isCollectionOffer
                      ? order.collections?.[0]?.name
                      : undefined,
                    id: order.id,
                  }),
                )}
                isOpen={true}
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
