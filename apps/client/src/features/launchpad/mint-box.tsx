import { ConnectButton } from '@/components/connect-button';
import { PriceCell } from '@/components/data-cells';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { lootex } from '@/lib/lootex';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { GetCollectionDropInfoResponse } from 'lootex/api/endpoints/collection';
import type { LootexCollection } from 'lootex/collection';
import { getDrop, prepareMint } from 'lootex/drop';
import { CurrencyAmount } from 'lootex/utils';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useConnection } from 'wagmi';
import { MintModal } from './mint-modal';

export const MintBox = ({
  className,
  collection,
  drop,
}: {
  className?: string;
  collection?: LootexCollection;
  drop?: GetCollectionDropInfoResponse;
}) => {
  const { address } = useConnection();
  const account = address ? { address } : undefined;
  const [quantity, setQuantity] = useState(1);
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const dropQuery = useQuery({
    queryKey: ['drop', { contractAddress: collection?.contractAddress }],
    queryFn: () => {
      return getDrop({
        client: lootex,
        chainId: Number(collection?.chainId),
        contractAddress: collection?.contractAddress as `0x${string}`,
        collectionSlug: collection?.slug as string,
        dropInfo: drop,
      });
    },
    enabled: !!collection?.slug,
  });

  // only triggered when logged in
  const prepareMintQuery = useQuery({
    queryKey: [
      'prepareMint',
      {
        walletAddress: account?.address,
        contractAddress: collection?.contractAddress,
      },
    ],
    queryFn: async () => {
      if (!dropQuery.data) {
        throw new Error('Drop not found');
      }

      if (!account?.address) {
        throw new Error('Account not found');
      }

      return prepareMint({
        client: lootex,
        drop: dropQuery.data,
        conditionId: BigInt(
          Number(dropQuery.data?.conditions?.displayConditionId),
        ),
        walletAddress: account.address as `0x${string}`,
      });
    },
    enabled: !!dropQuery.data && !!account?.address,
  });

  const unitPriceCurrencyAmount = useMemo(() => {
    if (!dropQuery.data) return undefined;

    const displayConditionId = dropQuery.data.conditions.displayConditionId;
    const { symbol, address: currencyAddress } =
      dropQuery.data.dropInfo.contract.drops[displayConditionId]?.currency ??
      {};

    const rawPrice =
      prepareMintQuery.data?.unitPrice ??
      dropQuery.data.conditions.pricePerToken;

    try {
      const currencyAmount = new CurrencyAmount(
        {
          decimals: 18,
          address: currencyAddress,
          chainId: Number(collection?.chainId),
          symbol,
        },
        rawPrice,
      );
      return currencyAmount;
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }, [dropQuery.data, prepareMintQuery.data, collection?.chainId]);

  const onIncrement = () => {
    const max = Number(prepareMintQuery.data?.availableAmount ?? 0);
    setQuantity((prev) => Math.min(prev + 1, max));
  };

  const onDecrement = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

  const onSetQuantity = (value: number) => {
    setQuantity(Math.max(value, 1));
  };

  const isWalletMintedAll = useMemo(() => {
    if (!prepareMintQuery.data) return false;
    return prepareMintQuery.data?.availableAmount <= BigInt(0);
  }, [prepareMintQuery.data]);

  const isSoldOut = useMemo(() => {
    return dropQuery.data?.conditions?.isSoldOut;
  }, [dropQuery.data]);

  const isStarted = useMemo(() => {
    return dropQuery.data?.conditions?.isStarted;
  }, [dropQuery.data]);

  const totalPriceCurencyAmount = useMemo(() => {
    if (!unitPriceCurrencyAmount) return undefined;
    return unitPriceCurrencyAmount.multiply(quantity);
  }, [unitPriceCurrencyAmount, quantity]);

  const limitPerWallet = useMemo(() => {
    if (!prepareMintQuery.data) return undefined;
    return prepareMintQuery.data?.limitPerWallet;
  }, [prepareMintQuery.data]);

  const isWhiteListOnly = useMemo(() => {
    return (
      dropQuery.data?.conditions?.quantityLimitPerWallet === BigInt(0) &&
      dropQuery.data?.conditions?.merkleRoot !==
        '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  }, [dropQuery.data]);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-4 md:p-6 rounded-lg bg-white',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-sm">Price</span>
          <h1 className="text-foreground font-brand text-3xl font-bold leading-[1]">
            {unitPriceCurrencyAmount ? (
              <PriceCell
                price={unitPriceCurrencyAmount.toFixed()}
                symbol={unitPriceCurrencyAmount.currency.symbol}
                exact
              />
            ) : (
              <Skeleton className="w-[120px] h-8" />
            )}
          </h1>
        </div>
        {dropQuery.data?.conditions && (
          <Badge variant="secondary">
            {isWhiteListOnly
              ? 'Whitelist Only'
              : `Phase ${
                  Number(dropQuery.data?.conditions?.displayConditionId) + 1
                }`}
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {dropQuery.data?.conditions?.percentage} % minted
          </span>
          <span className="text-muted-foreground text-sm">
            {dropQuery.data?.conditions?.totalMinted?.toString()}/
            {dropQuery.data?.conditions?.maxClaimableSupply?.toString()}
          </span>
        </div>
        <Progress value={dropQuery.data?.conditions?.percentage} />
      </div>
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            size="icon-lg"
            variant="secondary"
            onClick={onDecrement}
            disabled={
              isWalletMintedAll || !account?.address || isSoldOut || !isStarted
            }
          >
            <MinusIcon className="w-4 h-4" />
          </Button>
          <Input
            className="w-20 h-10 text-lg text-center rounded-lg flex-1"
            value={quantity}
            onChange={(e) => onSetQuantity(Number(e.target.value))}
            disabled={
              isWalletMintedAll || !account?.address || isSoldOut || !isStarted
            }
            type="number"
          />
          <Button
            size="icon-lg"
            variant="secondary"
            onClick={onIncrement}
            disabled={
              isWalletMintedAll || !account?.address || isSoldOut || !isStarted
            }
          >
            <PlusIcon className="w-4 h-4" />
          </Button>
        </div>
        {account?.address ? (
          <Button
            size="lg"
            className="font-brand"
            isLoading={prepareMintQuery.isPending}
            disabled={
              isWalletMintedAll ||
              isSoldOut ||
              !isStarted ||
              !prepareMintQuery.data
            }
            onClick={() => setIsMintModalOpen(true)}
          >
            {isSoldOut
              ? 'Sold Out 🎉'
              : isWalletMintedAll
                ? 'Limit Reached'
                : isStarted
                  ? 'Mint Now'
                  : 'Coming Soon'}
          </Button>
        ) : (
          <ConnectButton />
        )}
      </div>
      {account?.address && !isSoldOut && limitPerWallet && (
        <span className="text-muted-foreground text-sm">
          <span className="font-bold">
            {prepareMintQuery.data?.availableAmount?.toString()}
          </span>{' '}
          remaining (Max:{' '}
          <span className="font-bold">{limitPerWallet?.toString()}</span> per
          wallet)
        </span>
      )}
      <MintModal
        collection={collection}
        drop={dropQuery.data}
        isOpen={isMintModalOpen}
        setIsOpen={setIsMintModalOpen}
        unitPrice={unitPriceCurrencyAmount}
        totalPrice={totalPriceCurencyAmount}
        quantity={quantity}
        whitelistData={prepareMintQuery.data?.whitelistData}
        onMintSuccess={() => {
          prepareMintQuery.refetch();
          dropQuery.refetch();
          queryClient.invalidateQueries({
            queryKey: ['my-items'],
          });
          queryClient.invalidateQueries({
            queryKey: [
              'launchpad-history',
              { contractAddress: collection?.contractAddress },
            ],
          });
        }}
      />
    </div>
  );
};
