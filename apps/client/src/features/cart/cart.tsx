import { ItemCell, PriceCell } from '@/components/data-cells';
import { useModal } from '@/components/modal-manager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { apiClient } from '@/lib/lootex';
import { PopoverClose } from '@radix-ui/react-popover';
import { useMutation } from '@tanstack/react-query';
import { ShoppingCartIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useSelectionStore } from '../collection-browser/selection-store';

export const Cart = () => {
  const { selectedItems, setSelectedItems, removeItemByOrderHash } =
    useSelectionStore();
  const { onOpen: onOpenPurchaseModal } = useModal('purchase');
  const authGuard = useAuthGuard();

  const mutation = useMutation({
    mutationFn: async () => {
      const { orders } = await apiClient.orders.getOrders({
        hashes: selectedItems.map((item) => item.orderHash),
        limit: 20,
        page: 1,
      });

      return orders;
    },
    onSuccess: (orders) => {
      onOpenPurchaseModal({
        orders,
      });
    },
  });

  const totalPriceBreakdown = Object.entries(
    selectedItems.reduce<Record<string, number>>((acc, curr) => {
      const symbol = curr.priceSymbol;
      const price = parseFloat(curr.perPrice);
      acc[symbol] = (acc[symbol] ?? 0) + price;
      return acc;
    }, {}),
  ).map(([priceSymbol, total]) => ({
    priceSymbol,
    totalPrice: Math.round(total * 10000000) / 10000000,
  }));

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => {
          authGuard(() => {
            mutation.mutate();
          });
        }}
        isLoading={mutation.isPending}
        disabled={mutation.isPending || selectedItems.length === 0}
        className="min-w-[100px] h-auto"
      >
        {selectedItems.length === 0 ? (
          'Buy'
        ) : (
          <>
            <p>{`Buy ${selectedItems.length} items for`}</p>
            <div className="flex flex-col items-end">
              {totalPriceBreakdown.map((breakdown) => (
                <PriceCell
                  key={breakdown.priceSymbol}
                  price={breakdown.totalPrice.toFixed(18)}
                  symbol={breakdown.priceSymbol}
                  symbolClassName="text-primary-foreground"
                />
              ))}
            </div>
          </>
        )}
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="relative hidden md:inline-flex"
          >
            <ShoppingCartIcon className="w-4 h-4" />
            {selectedItems.length > 0 && (
              <Badge className="bg-[#FFE9A8] hover:bg-[#FFE9A8] text-[#2C2C2C] text-xs h-4 px-1 py-0.5 absolute top-[-12px] right-[-12px]">
                {selectedItems.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6}>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-brand flex items-center gap-1">
                Cart{' '}
                <Badge className="bg-[#FFE9A8] hover:bg-[#FFE9A8] text-[#2C2C2C]">
                  {selectedItems.length}
                </Badge>
              </h2>
              <div className="flex items-center gap-1">
                {selectedItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedItems([])}
                  >
                    Clear all
                  </Button>
                )}
                <PopoverClose asChild>
                  <Button variant="ghost" size="icon-sm">
                    <XIcon className="w-4 h-4" />
                  </Button>
                </PopoverClose>
              </div>
            </div>
            <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto">
              {(selectedItems.length &&
                selectedItems?.map((item) => (
                  <ItemCell
                    key={item.orderHash}
                    imageUrl={item.assetImageUrl}
                    title={`#${item.assetTokenId}`}
                    className="flex gap-2 justify-between items-center"
                  >
                    <PriceCell
                      price={item.perPrice?.toString() ?? ''}
                      symbol={item.priceSymbol}
                      className="text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItemByOrderHash(item.orderHash)}
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </Button>
                  </ItemCell>
                ))) || (
                <div className="text-sm text-gray-500">No items in cart</div>
              )}
            </div>
            <Separator />
            <div className="flex justify-between">
              <div className="text-sm">Total</div>
              {(totalPriceBreakdown.length > 0 && (
                <div className="flex flex-col items-end">
                  {totalPriceBreakdown.map((breakdown) => (
                    <PriceCell
                      key={breakdown.priceSymbol}
                      price={breakdown.totalPrice.toFixed(18)}
                      symbol={breakdown.priceSymbol}
                    />
                  ))}
                </div>
              )) ||
                '--'}
            </div>
            {/* <Button
              onClick={() => mutation.mutate()}
              isLoading={mutation.isPending}
              disabled={mutation.isPending || selectedItems.length === 0}
            >
              Checkout
            </Button> */}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
