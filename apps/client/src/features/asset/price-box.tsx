import { AddressCell, PriceCell } from '@/components/data-cells';
import { useModal } from '@/components/modal-manager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiClient } from '@/lib/lootex';
import { useQuery } from '@tanstack/react-query';
import type { OwnerAccount } from '@lootex-core/sdk/account';
import { type Asset, isErc1155Asset } from '@lootex-core/sdk/asset';
import { getChain } from '@lootex-core/sdk/chains';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import { useState } from 'react';
import { useConnection } from 'wagmi';
import { AcceptOfferButton } from '../accept-offer/accept-offer-button';
import { MakeOfferButton } from '../make-offer/make-offer-button';
import { useGetBestListing } from './use-get-best-listing';
import { useGetErc1155Balance } from './use-get-erc1155-balance';
import { useGetOffers } from './use-get-offers';

export const PriceBox = ({
  asset,
  collection,
  isLoadingOwners,
  owners,
}: {
  asset?: Asset;
  collection?: LootexCollection;
  isLoadingOwners?: boolean;
  owners?: OwnerAccount[];
}) => {
  const { onOpen: onOpenPurchaseModal } = useModal('purchase');
  const { onOpen: onOpenCancelListingModal } = useModal('cancelListing');
  const { address } = useConnection();
  const account = address ? { address } : undefined;
  const { onClose: closeAssetModal } = useModal('asset');

  const isErc1155 = isErc1155Asset(asset);

  const { items: offers, isLoading: isOffersLoading } = useGetOffers({
    asset,
  });

  const bestOffer = offers?.[0];

  const { data: erc1155Balance, isSuccess: isErc1155BalanceSuccess } =
    useGetErc1155Balance({
      asset,
      accountAddress: account?.address as `0x${string}`,
    });

  const isOwner =
    // erc1155
    (isErc1155 && erc1155Balance && erc1155Balance > 0) ||
    // erc721
    (owners?.length &&
      account?.address?.toLowerCase() === owners?.[0]?.address?.toLowerCase());

  const assetId = `${asset?.collectionChainShortName}/${asset?.contractAddress}/${asset?.assetTokenId}`;

  const { data: listings, isLoading: isListingsLoading } = useGetBestListing({
    asset,
  });

  const bestListing = listings?.orders[0];

  const { data: bestListingOfOwner, isLoading: isBestListingOfOwnerLoading } =
    useQuery({
      queryKey: ['asset-listings', { offerer: account?.address, assetId }],
      queryFn: () =>
        apiClient.orders.getOrders({
          chainId:
            asset?.contractChainId || asset?.collectionChainShortName
              ? getChain(asset?.collectionChainShortName).id
              : undefined,
          offerer: account?.address as `0x${string}`,
          contractAddress: asset?.contractAddress,
          tokenId: asset?.assetTokenId,
          category: 'LISTING',
          endTimeGt: Math.floor(Date.now() / 1000),
          sortBy: [
            ['price', 'ASC'],
            ['endTime', 'ASC'],
          ],
          isCancelled: false,
          isFillable: true,
          isExpired: false,
          limit: 1,
          page: 1,
        }),
      enabled:
        !!asset?.contractAddress &&
        !!asset?.assetTokenId &&
        !!isOwner &&
        !!isErc1155,
    });

  const bestOwnerListing = isErc1155
    ? bestListingOfOwner?.orders[0]
    : bestListing;

  const { onOpen: onOpenSellModal } = useModal('sell');

  const [tab, setTab] = useState<string>('buy');

  const renderBuySide = () => {
    return (
      <>
        {isListingsLoading ? (
          <Skeleton className="h-10 w-[50%]" />
        ) : bestListing ? (
          <>
            <p className="text-muted-foreground text-sm">Best price</p>
            <PriceCell
              price={bestListing?.price.toString()}
              symbol={bestListing?.priceSymbol}
              className="text-3xl font-brand self-start"
              threshold={0.000001}
            />
          </>
        ) : (
          <p className="text-muted-foreground text-sm my-1">Not for sale</p>
        )}
        <div className="flex gap-2">
          {bestListing ? (
            <Button
              className="flex-1 font-brand"
              size="lg"
              onClick={() => onOpenPurchaseModal({ orders: [bestListing] })}
            >
              Buy Now
            </Button>
          ) : null}
          <MakeOfferButton
            asset={asset}
            className="flex-1 font-brand"
            size="lg"
          />
        </div>
      </>
    );
  };

  const renderSellSide = () => {
    return (
      <>
        {isErc1155 ? (
          isBestListingOfOwnerLoading ? (
            <Skeleton className="h-10 w-[50%]" />
          ) : bestListingOfOwner?.orders[0] ? (
            <>
              <p className="text-muted-foreground text-sm">Your best listing</p>
              <PriceCell
                price={bestListingOfOwner?.orders[0]?.price.toString()}
                symbol={bestListingOfOwner?.orders[0]?.priceSymbol}
                className="text-3xl font-brand self-start"
              />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              You have no listings
            </p>
          )
        ) : isListingsLoading ? (
          <Skeleton className="h-10 w-[50%]" />
        ) : bestListing ? (
          <>
            <p className="text-muted-foreground text-sm">Best price</p>
            <PriceCell
              price={bestListing?.price.toString()}
              symbol={bestListing?.priceSymbol}
              className="text-3xl font-brand self-start"
              threshold={0.000001}
            />
          </>
        ) : (
          <p className="text-muted-foreground text-sm my-1">Not for sale</p>
        )}
        <div className="flex gap-3">
          <Button
            className="flex-1 font-brand"
            size="lg"
            onClick={() =>
              onOpenSellModal({
                assets: [asset],
                collections: [collection],
              })
            }
          >
            {bestOwnerListing ? 'List Again' : 'List'}
          </Button>
          {bestOwnerListing && (
            <Button
              className="flex-1 font-brand"
              size="lg"
              onClick={() =>
                onOpenCancelListingModal({
                  orders: [bestOwnerListing],
                })
              }
              variant="secondary"
            >
              Cancel Listing
            </Button>
          )}
        </div>
        {bestOffer && (
          <AcceptOfferButton
            orderHash={bestOffer?.hash}
            asset={asset}
            className="font-brand mt-1"
            size="lg"
          >
            Accept Offer{' '}
            <PriceCell
              price={bestOffer?.perPrice.toString()}
              symbol={bestOffer?.priceSymbol}
              className="font-body"
            />
          </AcceptOfferButton>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col rounded-lg p-3 gap-2 bg-white relative">
      <div className="absolute right-3 top-3">
        {isLoadingOwners ? (
          <Skeleton className="h-4 w-[100px]" />
        ) : (
          <Badge variant="secondary">
            {isErc1155 && isOwner ? (
              `You own: ${erc1155Balance}`
            ) : (
              <>
                Owned by:{' '}
                {isErc1155 ? (
                  'Multiple users'
                ) : isOwner ? (
                  'You'
                ) : (
                  <AddressCell
                    address={owners?.[0]?.address}
                    className="text-xs ml-1"
                    onClick={closeAssetModal}
                  />
                )}
              </>
            )}
          </Badge>
        )}
      </div>
      {isErc1155 && isOwner && (
        <Tabs onValueChange={setTab} value={tab}>
          <TabsList>
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      {isErc1155
        ? isOwner
          ? tab === 'buy'
            ? renderBuySide()
            : renderSellSide()
          : renderBuySide()
        : isOwner
          ? renderSellSide()
          : renderBuySide()}
    </div>
  );
};
