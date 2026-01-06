import { ItemCell, PriceCell } from '@/components/data-cells';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
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
import { lootex } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { tokens } from '@/lib/tokens';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueries } from '@tanstack/react-query';
import { erc1155Abi } from '@/sdk/exports/abi';
import { type Asset, isErc1155Asset } from '@/sdk/exports/asset';
import type { LootexOrder } from '@/sdk/exports/order';
import { CurrencyAmount, Fraction } from '@/sdk/exports/utils';
import { ChevronDownIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useConnection } from 'wagmi';
import { z } from 'zod';

const formSchema = z.object({
  offers: z.array(
    z.object({
      quantity: z.string().optional(),
      price: z.string(),
    }),
  ),
});

export const ReviewItemsStep = ({
  order,
  assets,
  onSubmit,
  isPending,
}: {
  order: LootexOrder;
  assets: Asset[];
  onSubmit: ({ offers }: { offers: { quantity?: string }[] }) => void;
  isPending: boolean;
}) => {
  const { address } = useConnection();
  const account = address ? { address } : undefined;
  const maxTotalQuantity = Number(
    order.seaportOrder.parameters.consideration[0].availableAmount || 0,
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      offers: assets?.map((asset) => ({
        quantity: '1',
        price: order.perPrice.toString(),
      })),
    },
  });

  const balances = useQueries({
    queries: assets.map((asset) => ({
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
    })),
  });

  const { offers } = useWatch({ control: form.control });

  const priceBreakdown = useMemo(() => {
    try {
      if (!order?.chainId) {
        throw new Error('No chain id found');
      }

      const chainId = order.chainId;
      const currency = tokens.find(
        (t) => t.chainId === chainId && t.symbol === order.priceSymbol,
      );

      if (!currency) return undefined;

      const totalPrice = assets.reduce(
        (sum, asset, index) => {
          const unitPrice = CurrencyAmount.fromFormattedAmount(
            currency,
            order.perPrice,
          );
          return sum.add(
            unitPrice.multiply(BigInt(offers?.[index].quantity ?? 1)),
          );
        },
        CurrencyAmount.fromFormattedAmount(currency, '0'),
      );

      const creatorFees = assets.reduce(
        (sum, asset) => {
          if (
            !asset.collectionCreatorFee ||
            !asset.collectionCreatorFeeAddress
          ) {
            return sum;
          }

          return sum.add(
            CurrencyAmount.fromFormattedAmount(
              currency,
              order.perPrice,
            ).multiply(
              Fraction.fromDecimal(asset.collectionCreatorFee ?? '0').divide(
                100,
              ),
            ),
          );
        },
        CurrencyAmount.fromFormattedAmount(currency, '0'),
      );

      const serviceFee = totalPrice.multiply(new Fraction(2, 100));
      const revenue = totalPrice.subtract(serviceFee).subtract(creatorFees);

      return {
        currency,
        totalPrice,
        serviceFee,
        revenue,
        creatorFees,
      };
    } catch (error) {
      return undefined;
    }
  }, [assets, order, offers]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Review Offer Details</DialogTitle>
      </DialogHeader>
      <Accordion
        type="single"
        collapsible
        defaultValue="items"
        className="overflow-auto"
      >
        <AccordionItem value="items">
          <AccordionTrigger className="pt-0">
            <div className="flex items-center gap-2">
              Items <Badge variant="outline">{assets?.length ?? 0}</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <Form {...form}>
              <div className="flex flex-col gap-2 max-h-[240px] py-1 overflow-y-auto">
                {assets.map((item, index) => (
                  <ItemCell
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    key={index}
                    imageUrl={item.assetImageUrl}
                    title={`#${item.assetTokenId}`}
                    subtitle={item.assetName}
                  >
                    {isErc1155Asset(assets[index]) && (
                      <FormField
                        control={form.control}
                        name={`offers.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="max-w-[60px] shrink-0">
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min={1}
                                max={Math.min(
                                  maxTotalQuantity,
                                  balances[index].data ?? 0,
                                )}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <PriceCell
                      exact
                      price={order.perPrice.toString()}
                      symbol={order.priceSymbol}
                    />
                  </ItemCell>
                ))}
              </div>
            </Form>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {priceBreakdown && (
        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="flex justify-between">
              <div className="font-bold flex items-center gap-1">
                You will receive <ChevronDownIcon className="w-4 h-4" />
              </div>
              <PriceCell
                price={priceBreakdown.revenue.toFixed(18)}
                symbol={priceBreakdown.currency.symbol}
                exact
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  Original offer price
                </div>
                <div className="text-sm font-bold">
                  <PriceCell
                    price={priceBreakdown.totalPrice.toFixed(18)}
                    symbol={priceBreakdown.currency.symbol}
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
                    price={`${priceBreakdown.serviceFee.toFixed(18)}`}
                    symbol={priceBreakdown.currency.symbol}
                    exact
                    negative
                  />
                </div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  Creator fees (0.5%, if applicable)
                </div>
                <div className="text-sm font-bold">
                  <PriceCell
                    price={`${priceBreakdown.creatorFees.toFixed(18)}`}
                    symbol={priceBreakdown.currency.symbol}
                    exact
                    negative
                  />
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
      <DialogFooter className="flex gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          isLoading={isPending}
          onClick={() => onSubmit({ offers: offers || [] })}
          className="font-brand"
        >
          Continue
        </Button>
      </DialogFooter>
    </>
  );
};
