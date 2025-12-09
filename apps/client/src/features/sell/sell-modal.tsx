import { ItemCell, PriceCell } from '@/components/data-cells';
import { OrderDetails } from '@/components/order-details';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { type EnhancedToken, tokens } from '@/lib/tokens';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { erc1155Abi } from 'lootex/abi';
import { createAggregator } from 'lootex/aggregator';
import { type Asset, isErc1155Asset } from 'lootex/asset';
import { getChain } from 'lootex/chains';
import type { LootexCollection } from 'lootex/collection';
import { SERVICE_FEE_ADDRESS } from 'lootex/order';
import type { LootexOrder } from 'lootex/order';
import { NATIVE } from 'lootex/token';
import { CurrencyAmount, Fraction } from 'lootex/utils';
import { ChevronDownIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useConnection } from 'wagmi';
import { parseErc6492Signature } from 'viem';
import { z } from 'zod';
import { useSelectionStore } from '../collection-browser/selection-store';
import { useSendTransaction } from '../wallet/use-send-transaction';

const durationOptions = [
  { id: '24_HOURS', value: 1000 * 60 * 60 * 24 * 1, label: '24H' },
  { id: '7_DAYS', value: 1000 * 60 * 60 * 24 * 7, label: '7 Days' },
  { id: '30_DAYS', value: 1000 * 60 * 60 * 24 * 30, label: '30 Days' },
  { id: '90_DAYS', value: 1000 * 60 * 60 * 24 * 90, label: '90 Days' },
  { id: '120_DAYS', value: 1000 * 60 * 60 * 24 * 120, label: '120 Days' },
];

const formSchema = z.object({
  duration: z.string(),
  listings: z.array(
    z.object({
      collectionSlug: z.string(),
      assetId: z.string(),
      price: z.string().pipe(z.coerce.number().gt(0).max(100000)),
      quantity: z.string().pipe(z.coerce.number().gt(0).max(100000)),
      currencySymbol: z.string().default('ETH'),
    }),
  ),
});

// ...

export const SellModal = ({
  assets,
  collections,
  isOpen,
  setIsOpen,
}: {
  assets?: Asset[];
  collections?: LootexCollection[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) => {
  const { address, connector } = useConnection();
  const account = address ? { address } : undefined;
  const { mutateAsync: sendTransactionAsync } = useSendTransaction();
  const queryClient = useQueryClient();
  const chainId =
    assets?.[0]?.contractChainId || assets?.[0]?.collectionChainShortName
      ? getChain(assets?.[0]?.collectionChainShortName).id
      : undefined;

  const [step, setStep] = useState<'confirm' | 'execute' | 'success'>(
    'execute',
  );
  const selectionStore = useSelectionStore();

  const defaultCurrency = useMemo(() => {
    const id = chainId ?? defaultChain.id;
    return NATIVE[id];
  }, [chainId]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      duration: durationOptions[2].value.toString(),
      listings: [],
    },
  });

  const listings = useWatch({
    control: form.control,
    name: 'listings',
  });

  useEffect(() => {
    if (!isOpen) return;

    setStep('confirm');
    setExecuteStep(1);

    form.reset({
      duration: durationOptions[2].value.toString(),
      //@ts-ignore
      listings:
        assets?.map((asset) => ({
          collectionSlug: asset.collectionSlug,
          assetId: asset.assetId,
          price: undefined,
          quantity: '1',
          currencySymbol: defaultCurrency.symbol,
        })) || [],
    });
  }, [isOpen, assets]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    prepareCreateOrdersMutation.mutate();
  }

  const [executeStep, setExecuteStep] = useState(1);
  const { toast } = useToast();

  const prepareCreateOrdersMutation = useMutation({
    mutationFn: async () => {
      if (!account) {
        throw new Error('No account found');
      }

      if (!assets?.length) {
        throw new Error('No asset found');
      }

      if (!chainId) {
        throw new Error('No chain id found');
      }

      const aggregator = createAggregator({
        client: lootex,
      });

      const listings = form.getValues('listings');

      const execution = await aggregator.createOrders({
        chainId,
        orders: assets?.map((asset, index) => {
          const maybeAllowCurrency = tokens.find(
            (t) =>
              t.chainId === chainId &&
              t.address.toLowerCase() ===
                asset?.collectionAllowCurrencies?.[0]?.address.toLowerCase(),
          );
          const currency = defaultCurrency;

          return {
            tokenAddress: asset.contractAddress,
            quantity: listings[index].quantity,
            tokenId: asset.assetTokenId,
            unitPrice: CurrencyAmount.fromFormattedAmount(
              currency,
              listings[index].price,
            ),
            duration: new Date(
              Date.now() + Number.parseInt(form.getValues('duration')),
            ),
            tokenType: isErc1155Asset(asset) ? 'ERC1155' : 'ERC721',
            orderType: 'LISTING',
            fees: [
              {
                recipient: SERVICE_FEE_ADDRESS,
                percentage: 2,
              },
              ...(asset?.collectionCreatorFee &&
              asset?.collectionCreatorFeeAddress
                ? [
                    {
                      recipient:
                        asset?.collectionCreatorFeeAddress as `0x${string}`,
                      percentage: Number(asset?.collectionCreatorFee),
                    },
                  ]
                : []),
            ],
          };
        }),
        accountAddress: account.address as `0x${string}`,
        //@ts-ignore
        walletClient: account,
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
      if (!createOrdersAction) {
        throw new Error('No create orders action found');
      }

      const result = await createOrdersAction.createOrders({
        createOrdersOnOrderbook: true,
        enableBulkOrder: connector?.id !== 'inApp',
        encodeSignature: (signature) => {
          return parseErc6492Signature(signature).signature;
        },
      });

      return result;
    },
    onSuccess: async (result) => {
      setStep('success');
      // Optimistic update assets queries
      const updateAssetsQuery = (queryKey: string) => {
        queryClient.setQueriesData<{ pages: { items: Asset[] }[] }>(
          { queryKey: [queryKey] },
          (oldData) => {
            if (oldData?.pages && oldData?.pages.length) {
              const { pages } = oldData;
              const newPages = JSON.parse(JSON.stringify(pages));

              if (!Array.isArray(result?.lootexOrders)) return oldData;

              newPages.forEach((page: any) => {
                if (!Array.isArray(page.items)) return;
                page.items = page.items.map((asset: Asset) => {
                  const matchingAsset = result.lootexOrders.find(
                    (order: LootexOrder) =>
                      order?.assets?.[0]?.assetId === asset?.assetId,
                  );
                  return {
                    ...asset,
                    ...(matchingAsset?.assets?.[0] && {
                      ...matchingAsset?.assets?.[0],
                    }),
                  };
                });
              });
              return { ...oldData, pages: newPages };
            }
            return oldData;
          },
        );
      };
      updateAssetsQuery('my-items');
      updateAssetsQuery('nfts');

      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['asset-listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      selectionStore.clear();

      // Track listing event
      if (result.lootexOrders) {
        const eventData = {
          number_of_items: result.lootexOrders.length,
          items: result.lootexOrders.map((order) => ({
            collection_slug: order.assets[0]?.collectionSlug,
            token_id: order.assets[0]?.assetTokenId,
            unit_price: Number(order.perPrice),
            currency: order.priceSymbol,
            quantity: 1,
          })),
          chain_id: chainId,
          total_value: result.lootexOrders.reduce(
            (acc: number, order: LootexOrder) => acc + Number(order.perPrice),
            0,
          ),
          duration: form.getValues('duration'),
          wallet_address: account?.address,
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

      // Group listings by currency
      const listingsByCurrency = listings.reduce(
        (acc, listing) => {
          const currency =
            tokens.find((t) => t.symbol === listing.currencySymbol) ??
            defaultCurrency;
          if (!acc[currency.symbol]) {
            acc[currency.symbol] = {
              currency,
              totalPrice: CurrencyAmount.fromFormattedAmount(currency, '0'),
              serviceFee: CurrencyAmount.fromFormattedAmount(currency, '0'),
              creatorFees: CurrencyAmount.fromFormattedAmount(currency, '0'),
              revenue: CurrencyAmount.fromFormattedAmount(currency, '0'),
            };
          }
          return acc;
        },
        {} as Record<
          string,
          {
            currency: (typeof NATIVE)[number] | EnhancedToken;
            totalPrice: CurrencyAmount;
            serviceFee: CurrencyAmount;
            creatorFees: CurrencyAmount;
            revenue: CurrencyAmount;
          }
        >,
      );

      // Calculate totals for each currency
      listings.forEach((listing, index) => {
        const currency =
          tokens.find((t) => t.symbol === listing.currencySymbol) ??
          defaultCurrency;

        const currencyBreakdown = listingsByCurrency[currency.symbol];

        const price = CurrencyAmount.fromFormattedAmount(
          currency,
          listing.price || '0',
        ).multiply(listing.quantity);

        currencyBreakdown.totalPrice = currencyBreakdown.totalPrice.add(price);

        const listingServiceFee = price.multiply(new Fraction(2, 100));
        currencyBreakdown.serviceFee =
          currencyBreakdown.serviceFee.add(listingServiceFee);

        if (
          assets?.[index]?.collectionCreatorFee &&
          assets?.[index]?.collectionCreatorFeeAddress
        ) {
          const creatorFee = price.multiply(
            Fraction.fromDecimal(
              assets[index].collectionCreatorFee ?? '0',
            ).divide(100),
          );
          currencyBreakdown.creatorFees =
            currencyBreakdown.creatorFees.add(creatorFee);
        }

        currencyBreakdown.revenue = currencyBreakdown.revenue.add(
          price
            .subtract(listingServiceFee)
            .subtract(currencyBreakdown.creatorFees),
        );
      });

      return Object.values(listingsByCurrency);
    } catch (error) {
      return undefined;
    }
  }, [listings, chainId, assets]);

  // Add helper function to update all prices
  const updateAllPrices = (price: string) => {
    const newListings =
      listings?.map((listing) => ({
        ...listing,
        price,
      })) || [];
    //@ts-ignore
    form.setValue('listings', newListings);
    form.trigger('listings');
  };

  const applyFloorPrice = () => {
    const newListings =
      assets?.map((asset) => ({
        collectionSlug: asset.collectionSlug,
        assetId: asset.assetTokenId,
        price:
          //@ts-ignore
          asset.collectionFloorPrice?.toString() ||
          collections?.[0]?.floorPrice?.toString() ||
          undefined,
        quantity: '1',
        currencySymbol: defaultCurrency.symbol,
      })) || [];
    //@ts-ignore
    form.setValue('listings', newListings);
    form.trigger('listings');
  };

  const floorPriceSymbol = useMemo(() => {
    const symbols = Array.from(
      new Set(listings?.map((listing) => listing.currencySymbol)),
    );
    if (symbols.length > 1) {
      return defaultCurrency.symbol;
    }
    return symbols[0];
  }, [listings]);

  const balances = useQueries({
    queries:
      assets?.map((asset) => ({
        queryKey: [
          'balance',
          {
            contractAddress: asset.contractAddress,
            tokenId: asset.assetTokenId,
            account: account?.address,
          },
        ],
        queryFn: async () => {
          if (!account || !asset.assetTokenId) {
            throw new Error('No account or token id');
          }

          const balance = await lootex
            .getPublicClient({ chainId: defaultChain.id })
            .readContract({
              address: asset.contractAddress,
              abi: erc1155Abi,
              functionName: 'balanceOf',
              args: [
                account?.address as `0x${string}`,
                BigInt(asset.assetTokenId),
              ],
            });

          return Number(balance);
        },
        enabled:
          !!account &&
          !!asset.assetTokenId &&
          !!asset.contractAddress &&
          !!isErc1155Asset(asset),
      })) || [],
  });

  const [completedApprovals, setCompletedApprovals] = useState(0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle>Create Listing</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold">Apply to all</span>
              <div className="flex items-center gap-2 flex-nowrap ">
                <Button
                  type="button"
                  onClick={() => applyFloorPrice()}
                  className="font-brand"
                  variant="secondary"
                >
                  Floor Price
                </Button>
                <span className="text-sm text-muted-foreground">or</span>
                <div className="flex items-center gap-2 flex-nowrap flex-1">
                  <Input
                    placeholder="Set custom price"
                    onChange={(e) => updateAllPrices(e.target.value)}
                    type="number"
                  />
                  {floorPriceSymbol}
                </div>
              </div>
            </div>
            <Separator />
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4 overflow-auto"
              >
                <div className="flex flex-col items-stretch gap-3 max-h-[240px] overflow-y-auto py-1">
                  {assets?.map((asset, index) => (
                    <ItemCell
                      key={asset?.assetTokenId}
                      imageUrl={asset?.assetImageUrl}
                      title={`#${asset?.assetTokenId}`}
                      subtitle={asset?.assetName}
                    >
                      {isErc1155Asset(asset) && (
                        <FormField
                          control={form.control}
                          name={`listings.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem className="max-w-[60px] shrink-0">
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  min={1}
                                  max={balances[index].data ?? 1}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <Controller
                        control={form.control}
                        name={`listings.${index}.price`}
                        render={({ field }) => (
                          <FormItem className="max-w-[200px] shrink-0">
                            <FormControl>
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  placeholder="Enter price"
                                  {...field}
                                  type="number"
                                />
                                <span className="text-sm text-muted-foreground">
                                  {listings[index]?.currencySymbol}
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </ItemCell>
                  ))}
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <Collapsible>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex justify-between">
                          <div className="font-bold flex items-center gap-1">
                            You will receive{' '}
                            <ChevronDownIcon className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col items-end">
                            {priceBreakdown.map((breakdown) => (
                              <PriceCell
                                key={breakdown.currency.symbol}
                                price={breakdown.revenue.toFixed(18)}
                                symbol={breakdown.currency.symbol}
                                exact
                              />
                            ))}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="flex flex-col gap-1 mt-2">
                          {priceBreakdown.map((breakdown) => (
                            <div
                              key={breakdown.currency.symbol}
                              className="flex flex-col gap-1"
                            >
                              <div className="text-sm font-bold text-muted-foreground">
                                {breakdown.currency.symbol}
                              </div>
                              <div className="flex justify-between">
                                <div className="text-sm text-muted-foreground">
                                  Total Price
                                </div>
                                <div className="text-sm font-bold">
                                  <PriceCell
                                    price={breakdown.totalPrice.toFixed(18)}
                                    symbol={breakdown.currency.symbol}
                                    exact
                                  />
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <div className="text-sm text-muted-foreground">
                                  Platform fee (2%)
                                </div>
                                <div className="text-sm font-bold">
                                  <PriceCell
                                    price={`${breakdown.serviceFee.toFixed(
                                      18,
                                    )}`}
                                    symbol={breakdown.currency.symbol}
                                    exact
                                    negative
                                  />
                                </div>
                              </div>
                              <div className="flex justify-between">
                                <div className="text-sm text-muted-foreground">
                                  Creator fees (if applicable)
                                </div>
                                <div className="text-sm font-bold">
                                  <PriceCell
                                    price={`${breakdown.creatorFees.toFixed(
                                      18,
                                    )}`}
                                    symbol={breakdown.currency.symbol}
                                    exact
                                    negative
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!form.formState.isValid}
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
              <DialogTitle>Submit Listing</DialogTitle>
            </DialogHeader>

            <ProgressSteps currentStep={executeStep}>
              <ProgressStep title="Approve Collection">
                <p>Approve collections for listing on Biru (one-time only)</p>
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
              <ProgressStep title="Sign Listing">
                <p>Sign with your wallet to confirm the listing of your NFT</p>
                <Button
                  size="lg"
                  onClick={() => createOrdersMutation.mutate()}
                  disabled={createOrdersMutation.isPending}
                  isLoading={createOrdersMutation.isPending}
                  className="font-brand"
                >
                  Sign Listings
                </Button>
              </ProgressStep>
            </ProgressSteps>
          </>
        )}
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Listing Created Successfully</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-stretch gap-4">
              <p className="text-gray-600">
                Congratulations! You have successfully listed {assets?.length}{' '}
                items.
              </p>
              <OrderDetails
                items={createOrdersMutation.data?.lootexOrders?.map(
                  (order) => ({
                    imageUrl: order.assets[0].assetImageUrl,
                    price: order.perPrice.toString(),
                    symbol: order.priceSymbol,
                    title: `#${order.assets[0].assetTokenId}`,
                    subtitle: order.assets[0].assetName,
                    quantity: Number(
                      order.seaportOrder?.parameters.offer[0].endAmount,
                    ),
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
