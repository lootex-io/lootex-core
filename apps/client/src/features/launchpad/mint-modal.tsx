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
import { apiClient, lootex } from '@/lib/lootex';
import { extractTransferedTokensFromLogs } from '@/utils/transaction';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import type { Asset } from '@lootex-core/sdk/asset';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import {
  type GetDropResult,
  type PrepareMintResult,
  mint,
} from '@lootex-core/sdk/drop';
import type { CurrencyAmount } from '@lootex-core/sdk/utils';
import { AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatUnits } from 'viem';
import { useConnection, useBalance } from 'wagmi';
import { SwapButton } from '../swap/swap-button';
import { useSendTransaction } from '../wallet/use-send-transaction';

export const MintModal = ({
  isOpen,
  setIsOpen,
  collection,
  drop,
  quantity,
  whitelistData,
  unitPrice,
  totalPrice,
  onMintSuccess,
  tokenId,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  collection?: LootexCollection;
  drop?: GetDropResult;
  quantity: number;
  unitPrice?: CurrencyAmount;
  totalPrice?: CurrencyAmount;
  whitelistData?: PrepareMintResult['whitelistData'];
  onMintSuccess: (assets: Asset[]) => void;
  tokenId?: string;
}) => {
  const [step, setStep] = useState<'confirm' | 'execute' | 'success'>(
    'confirm',
  );
  const { mutateAsync: sendTransactionAsync } = useSendTransaction();
  const { address } = useConnection();
  const { toast } = useToast();
  const [executeStep, setExecuteStep] = useState<number>(1);
  const queryClient = useQueryClient();

  const [mintedAssets, setMintedAssets] = useState<Asset[]>([]);

  const { data: balance, isSuccess: isLoadBalanceSuccess } = useBalance({
    address: address,
    ...(unitPrice?.currency.symbol !== 'ETH' && {
      token: unitPrice?.currency?.address?.toLowerCase() as `0x${string}`,
    }),
  });

  const insufficientFunds = useMemo(() => {
    if (!totalPrice) return false;

    return (
      isLoadBalanceSuccess &&
      (balance?.value < totalPrice.quotient() || balance?.value === BigInt(0))
    );
  }, [isLoadBalanceSuccess, balance, totalPrice]);

  const prepareMintMutation = useMutation({
    mutationFn: async () => {
      if (!drop) {
        throw new Error('Drop not found');
      }

      if (!whitelistData) {
        throw new Error('Whitelist data not found');
      }

      if (!address) {
        throw new Error('Account not found');
      }

      return await mint({
        client: lootex,
        drop,
        walletAddress: address as `0x${string}`,
        quantity,
        isWhitelistMint: whitelistData.isWhitelisted,
        whitelistData,
        ...(tokenId ? { tokenId: BigInt(tokenId) } : {}),
      });
    },
    onSuccess: (data) => {
      setStep('execute');
      if (data.actions.length > 1) {
        setExecuteStep(1);
      } else {
        setExecuteStep(2);
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

  const approveAction = prepareMintMutation.data?.actions?.find(
    (action) => action.type === 'approve',
  );

  const mintAction = prepareMintMutation.data?.actions?.find(
    (action) => action.type === 'mint',
  );

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!approveAction) {
        throw new Error('Approve action not found');
      }

      const tx = await approveAction.buildTransaction();
      return await sendTransactionAsync(tx);
    },
    onSuccess: async (receipt) => {
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

  const mintMutation = useMutation({
    mutationFn: async () => {
      if (!mintAction) {
        throw new Error('Mint action not found');
      }

      const tx = await mintAction.buildTransaction();
      return await sendTransactionAsync(tx);
    },
    onSuccess: async (receipt) => {
      try {
        const res = await apiClient.request({
          method: 'PUT',
          path: `/v3/orders/sync/${collection?.chainId}/${receipt.transactionHash}`,
        });

        const tokenIds = extractTransferedTokensFromLogs(res as string[]);
        if (tokenIds.length > 0) {
          const assets = await Promise.all(
            tokenIds.map((tokenId) =>
              apiClient.assets.getAsset(
                `${collection?.chainShortName}/${collection?.contractAddress}/${tokenId}`,
              ),
            ),
          );

          setMintedAssets(assets);
        }

        queryClient.invalidateQueries({ queryKey: ['blindbox-assets'] });
      } catch (error) {
        console.error(error);
      }

      setStep('success');
      onMintSuccess(mintedAssets);
    },
    onError: (error) => {
      console.error(error);
      toast({
        title: 'Oops! Something went wrong',
        description: `${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const ref = useRef<HTMLDivElement | null>(null);

  const fireConfetti = () => {
    confetti({
      particleCount: 40,
      startVelocity: 20,
      spread: 80,
      origin: {
        y: 0.55,
      },
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    const animationFrame = requestAnimationFrame(() => {
      if (ref.current && step === 'success') {
        fireConfetti();
      }
    });
    return () => {
      cancelAnimationFrame(animationFrame);
      confetti.reset();
    };
  }, [step]);

  useEffect(() => {
    if (!isOpen) {
      confetti.reset();
    }
  }, [isOpen]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (isOpen) {
      setStep('confirm');
      setExecuteStep(1);
      setMintedAssets([]);
      prepareMintMutation.reset();
      approveMutation.reset();
      mintMutation.reset();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold font-brand">
                Confirm Mint
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-stretch gap-4">
              <p className="text-gray-600">
                You are about to mint{' '}
                <span className="font-bold">
                  {quantity} {collection?.name}
                </span>{' '}
                NFTs.
              </p>
              <OrderDetails
                items={Array.from({ length: quantity }).map((_, index) => ({
                  id: index.toString(),
                  imageUrl: drop?.dropInfo.contract.dropUrls?.[0] ?? '',
                  price: unitPrice?.toFixed() ?? '',
                  symbol: unitPrice?.currency.symbol ?? '',
                  title: collection?.name ?? '',
                }))}
                isOpen={true}
              />
              <div className="flex flex-col gap-1">
                <div className="flex justify-between font-bold">
                  <div>You will pay</div>
                  <PriceCell
                    price={totalPrice?.toFixed()}
                    symbol={totalPrice?.currency.symbol}
                    exact
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <div>+ Estimated Gas Fee</div>
                  <PriceCell price="0.0000001" symbol="ETH" />
                </div>
              </div>
              {insufficientFunds && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-base font-semibold">
                    Not enough funds
                  </AlertTitle>
                  <AlertDescription className="text-sm flex flex-col gap-2">
                    <span>
                      Your balance{' '}
                      <span className="font-bold">
                        {balance
                          ? formatUnits(balance.value, balance.decimals)
                          : '0'}{' '}
                        {unitPrice?.currency.symbol}
                      </span>{' '}
                      is insufficient to complete this purchase or cover gas
                      fees.
                    </span>
                    <SwapButton
                      fromToken="ETH"
                      toToken={unitPrice?.currency.symbol ?? ''}
                      type="button"
                      className="self-start"
                    >
                      Convert ETH to {unitPrice?.currency.symbol}
                    </SwapButton>
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button
                size="lg"
                className="font-brand"
                onClick={() => prepareMintMutation.mutate()}
                isLoading={prepareMintMutation.isPending}
                disabled={prepareMintMutation.isPending || insufficientFunds}
              >
                Confirm Mint
              </Button>
            </DialogFooter>
          </>
        )}
        {step === 'execute' && (
          <>
            <DialogHeader>
              <DialogTitle>Complete Purchase</DialogTitle>
            </DialogHeader>
            <OrderDetails
              items={Array.from({ length: quantity }).map((_, index) => ({
                id: index.toString(),
                imageUrl: drop?.dropInfo.contract.dropUrls?.[0] ?? '',
                price: unitPrice?.toFixed() ?? '',
                symbol: unitPrice?.currency.symbol ?? '',
                title: collection?.name ?? '',
              }))}
              isOpen={false}
            />
            <ProgressSteps currentStep={executeStep}>
              <ProgressStep title="Approve Currency">
                <p>
                  Approve {unitPrice?.currency.symbol} for minting this
                  collection (one-time only)
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
                  onClick={() => mintMutation.mutate()}
                  isLoading={mintMutation.isPending}
                  className="font-brand"
                >
                  Mint
                </Button>
              </ProgressStep>
            </ProgressSteps>
          </>
        )}
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-brand">
                Mint Successful
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-stretch gap-3 w-full">
              <p className="text-gray-600">
                You have minted{' '}
                <span className="font-bold">
                  {mintedAssets?.length} {collection?.name}
                </span>{' '}
                NFT.
              </p>
              <OrderDetails
                items={mintedAssets?.map((asset, index) => ({
                  id: index.toString(),
                  imageUrl: asset.assetImageUrl ?? '',
                  price: unitPrice?.toFixed() ?? '',
                  symbol: unitPrice?.currency.symbol ?? '',
                  title: `#${asset?.assetTokenId}`,
                  subtitle: asset?.collectionName ?? '',
                }))}
                isOpen={true}
              />

              <div className="flex flex-col items-start gap-2">
                <ViewTransactionLink
                  txHash={mintMutation.data?.transactionHash}
                />
              </div>
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
