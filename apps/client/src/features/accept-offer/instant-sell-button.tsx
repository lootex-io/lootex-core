import { PriceCell } from '@/components/data-cells';
import { useModal } from '@/components/modal-manager';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/lootex';
import { useQuery } from '@tanstack/react-query';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import { ZapIcon } from 'lucide-react';
import { useConnection } from 'wagmi';
import { useGetMyItems } from '../collection-browser/use-get-my-items';

const InstantSellButton = ({
  collection,
  ...props
}: ButtonProps & { collection?: LootexCollection }) => {
  const { onOpen } = useModal('acceptOffer');
  const authGuard = useAuthGuard();
  const { toast } = useToast();
  const { address } = useConnection();
  const account = address ? { address } : undefined;
  const seaportOrder = collection?.bestCollectionOffer?.bestSeaportOrder;
  const { data: fullOrder } = useQuery({
    queryKey: ['order', seaportOrder?.hash],
    queryFn: () =>
      apiClient.orders.getOrders({
        hashes: [seaportOrder?.hash as `0x${string}`],
        page: 1,
        limit: 1,
      }),
    enabled: !!seaportOrder?.hash,
  });

  const itemsQuery = useGetMyItems({
    chainId: Number(collection?.chainId),
    collectionSlug: collection?.slug,
    walletAddress: account?.address,
  });

  const isAvailable = Boolean(
    fullOrder?.orders?.[0]?.isFillable && !fullOrder?.orders?.[0]?.isCancelled,
  );

  const userHasItems = !!itemsQuery?.items?.length;

  const disabledReason = !isAvailable
    ? 'This offer is no longer available'
    : !userHasItems
      ? "You don't have any items from this collection"
      : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Button
              size="lg"
              className="font-brand"
              variant="secondary"
              disabled={!isAvailable || !userHasItems}
              onClick={() => {
                authGuard(() => {
                  if (
                    fullOrder?.orders?.[0]?.offerer?.toLocaleLowerCase() ===
                    account?.address?.toLocaleLowerCase()
                  ) {
                    toast({
                      title: 'Error',
                      description: 'You cannot accept your own offer',
                      variant: 'destructive',
                    });
                    return;
                  }

                  onOpen({
                    order: fullOrder?.orders?.[0],
                    assets:
                      itemsQuery?.items?.length === 1
                        ? itemsQuery?.items
                        : undefined,
                  });
                });
              }}
              {...props}
            >
              <ZapIcon className="w-4 h-4" />
              Instant Sell{' '}
              {seaportOrder?.perPrice && (
                <PriceCell
                  price={seaportOrder?.perPrice.toString()}
                  symbol={collection?.bestCollectionOffer?.priceSymbol ?? ''}
                  className="font-body"
                />
              )}
            </Button>
          </div>
        </TooltipTrigger>
        {disabledReason && <TooltipContent>{disabledReason}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
};

export default InstantSellButton;
