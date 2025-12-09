import { PriceCell, removeTrailingZeros } from '@/components/data-cells';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { ProgressStep, ProgressSteps } from '@/components/ui/progress-steps';
import { Separator } from '@/components/ui/separator';
import { ViewTransactionLink } from '@/components/view-transaction-link';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useToast } from '@/hooks/use-toast';
import { apiClient, lootex } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { createSwapClient } from 'lootex/swap';
import { ArrowUpDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { formatUnits } from 'viem';
import { useConnection, useBalance } from 'wagmi';
import type { z } from 'zod';
import { useSendTransaction } from '../wallet/use-send-transaction';
import { AmountInput } from './amount-input';
import { schema, tokens } from './constants';
import { CurrencySelect } from './currency-select';
import { SonexLogo } from './sonex-logo';

// ...

export const Swap = ({
  isOpen,
  setIsOpen,
  fromToken: initialFromToken,
  toToken: initialToToken,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  fromToken?: string;
  toToken?: string;
}) => {
  const [step, setStep] = useState<'form' | 'execute' | 'success'>('form');
  const [executeStep, setExecuteStep] = useState(1);
  const { address } = useConnection();
  const account = address ? { address } : undefined;
  const authGuard = useAuthGuard();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      fromToken: initialFromToken ?? tokens[0].symbol,
      toToken: initialToToken,
    },
  });

  const { fromToken, toToken, fromAmount, toAmount } = form.watch();

  const { data: fromTokenBalance, refetch: refetchFromTokenBalance } =
    useBalance({
      address: account?.address as `0x${string}`,
      ...(fromToken !== 'ETH' && {
        token: tokens
          .find((t) => t.symbol === fromToken)
          ?.address.toLowerCase() as `0x${string}`,
      }),
      chainId: defaultChain.id,
      query: {
        enabled: !!account?.address && !!fromToken,
      },
    });

  const { data: toTokenBalance, refetch: refetchToTokenBalance } = useBalance({
    address: account?.address as `0x${string}`,
    ...(toToken !== 'ETH' && {
      token: tokens
        .find((t) => t.symbol === toToken)
        ?.address.toLowerCase() as `0x${string}`,
    }),
    chainId: defaultChain.id,
    query: {
      enabled: !!account?.address && !!toToken,
    },
  });

  const { toast } = useToast();

  const swapClient = createSwapClient({
    chainId: defaultChain.id,
    client: lootex,
  });

  const { mutateAsync: sendTransactionAsync } = useSendTransaction();

  const calculateTradeMutation = useMutation({
    mutationFn: async ({
      amount,
      direction,
    }: {
      amount: string;
      direction: 'input' | 'output';
    }) => {
      const accountAddress = account?.address as `0x${string}`;
      const slippage = 0.5; // 0.5%

      const tokenIn = tokens.find((t) => t.symbol === fromToken);
      const tokenOut = tokens.find((t) => t.symbol === toToken);

      if (!tokenIn || !tokenOut) {
        throw new Error('Invalid token');
      }

      if (direction === 'input') {
        return await swapClient.getExactInputTrade(
          tokenIn,
          tokenOut,
          amount,
          accountAddress,
          slippage,
        );
      }

      return await swapClient.getExactOutputTrade(
        tokenIn,
        tokenOut,
        amount,
        accountAddress,
        slippage,
      );
    },
    onSuccess: (data, { direction }) => {
      if (direction === 'input') {
        form.setValue(
          'toAmount',
          removeTrailingZeros(data.currencyAmountOut.toFixed(6)),
        );
      } else {
        form.setValue(
          'fromAmount',
          removeTrailingZeros(data.currencyAmountIn.toFixed(6)),
        );
      }
      form.trigger();
    },
    onError: (error, { direction }) => {
      if (direction === 'input') {
        form.setValue('toAmount', '');
      } else {
        form.setValue('fromAmount', '');
      }
      form.trigger();
      console.error('Failed to update to amount:', error);
    },
  });

  // Handle input changes
  const onFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue('fromAmount', value);
    calculateTradeMutation.mutate({
      amount: value,
      direction: 'input',
    });
  };

  const onToAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue('toAmount', value);
    calculateTradeMutation.mutate({
      amount: value,
      direction: 'output',
    });
  };

  const onMaxFromAmountClick = () => {
    const maxAmount = fromTokenBalance
      ? formatUnits(fromTokenBalance.value, fromTokenBalance.decimals)
      : '0';
    form.setValue('fromAmount', maxAmount);
    calculateTradeMutation.mutate({
      amount: maxAmount,
      direction: 'input',
    });
  };

  const handleTokenChange = (type: 'from' | 'to', value: string) => {
    const fieldName = type === 'from' ? 'fromToken' : 'toToken';
    const oppositeFieldName = type === 'from' ? 'toToken' : 'fromToken';

    form.setValue(fieldName, value);
    if (value === form.getValues(oppositeFieldName)) {
      // Find the first available token that's not the selected one
      const newToken = tokens.find((t) => t.symbol !== value)?.symbol;
      form.setValue(oppositeFieldName, newToken);
    }
    calculateTradeMutation.mutate({
      amount: fromAmount,
      direction: 'input',
    });
    form.trigger();
  };

  const handleSwapDirection = () => {
    // Swap token selections
    const newFromToken = toToken;
    const newToToken = fromToken;

    form.setValue('fromToken', newFromToken);
    form.setValue('toToken', newToToken);

    // Swap amounts
    const newFromAmount = toAmount;
    const newToAmount = fromAmount;
    form.setValue('fromAmount', newFromAmount);
    form.setValue('toAmount', newToAmount);

    // If we have a new from amount, recalculate the trade
    if (newFromAmount) {
      calculateTradeMutation.mutate({
        amount: newFromAmount,
        direction: 'input',
      });
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (isOpen) {
      form.reset({
        fromToken: initialFromToken ?? tokens[0].symbol,
        toToken: initialToToken,
      });
      prepareMutation.reset();
      calculateTradeMutation.reset();
      approveMutation.reset();
      swapMutation.reset();
      setStep('form');
      setExecuteStep(1);
    }
  }, [isOpen]);

  const prepareMutation = useMutation({
    mutationFn: async () => {
      const actions = await calculateTradeMutation.data?.getActions();

      if (!actions || actions.length === 0) {
        throw new Error('No actions found');
      }

      return actions;
    },
    onSuccess: (actions) => {
      setStep('execute');

      // If there's only one action, we can skip the approval step
      if (actions.length === 1) {
        setExecuteStep(2);
      }
    },
    onError: (error) => {
      console.error('Failed to prepare swap:', error);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const approveAction = prepareMutation?.data?.find(
        (action) => action.type === 'approve',
      );

      if (!approveAction) {
        throw new Error('No approve action found');
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

  const swapMutation = useMutation({
    mutationFn: async () => {
      const swapAction = prepareMutation?.data?.find(
        (action) => action.type === 'swap',
      );

      if (!swapAction) {
        throw new Error('No swap action found');
      }

      const tx = await swapAction.buildTransaction();

      return await sendTransactionAsync(tx);
    },
    onSuccess: async (txReceipt) => {
      try {
        await apiClient.misc.syncTxHash({
          chainId: defaultChain.id,
          txHash: txReceipt.transactionHash,
        });
      } catch (error) {
        console.error('Failed to sync tx hash:', error);
      }

      refetchFromTokenBalance();
      refetchToTokenBalance();
      setStep('success');
    },
    onError: (error) => {
      console.error('Failed to swap:', error);
    },
  });

  const onSubmit = async () => {
    authGuard(() => {
      prepareMutation.mutate();
    });
  };

  const isInsufficientBalance = useMemo(() => {
    if (!calculateTradeMutation.data) {
      return false;
    }

    // Return false if balances haven't loaded yet
    if (!fromTokenBalance) {
      return false;
    }

    return (
      calculateTradeMutation.data.currencyAmountIn.quotient() >
      (fromTokenBalance.value ?? BigInt(0))
    );
  }, [fromTokenBalance, calculateTradeMutation.data]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="max-w-[460px]"
        {...(step === 'execute' && { onBack: () => setStep('form') })}
      >
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Swap</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
              >
                {/* Pay section */}
                <div className="flex flex-col gap-2 rounded-lg border p-4">
                  <span className="font-bold text-sm text-muted-foreground">
                    You Pay
                  </span>
                  <div className="flex items-center gap-2">
                    <AmountInput
                      value={fromAmount}
                      onChange={onFromAmountChange}
                      isLoading={
                        calculateTradeMutation.isPending &&
                        calculateTradeMutation.variables?.direction === 'output'
                      }
                      // className={
                      //   isInsufficientBalance ? 'text-destructive' : ''
                      // }
                    />
                    <CurrencySelect
                      value={fromToken}
                      onChange={(value) => handleTokenChange('from', value)}
                    />
                  </div>
                  {fromToken && (
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          'text-sm text-muted-foreground',
                          // isInsufficientBalance && 'text-destructive',
                        )}
                      >
                        Balance:{' '}
                        {fromTokenBalance
                          ? formatUnits(
                              fromTokenBalance.value,
                              fromTokenBalance.decimals,
                            )
                          : '0'}
                      </span>
                      {fromToken && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={onMaxFromAmountClick}
                          type="button"
                          className="h-6 px-2"
                        >
                          Max
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {/* Swap direction toggle */}
                <div className="flex justify-center my-[-4px]">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full"
                    onClick={handleSwapDirection}
                    type="button"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* Receive section */}
                <div className="flex flex-col gap-2 rounded-lg border p-4">
                  <span className="font-bold text-sm text-muted-foreground">
                    You Receive
                  </span>
                  <div className="flex items-center gap-2">
                    <AmountInput
                      value={toAmount}
                      onChange={onToAmountChange}
                      isLoading={
                        calculateTradeMutation.isPending &&
                        calculateTradeMutation.variables?.direction === 'input'
                      }
                    />
                    <CurrencySelect
                      value={toToken}
                      onChange={(value) => handleTokenChange('to', value)}
                    />
                  </div>
                  {toToken && (
                    <span className="text-sm text-muted-foreground">
                      Balance:{' '}
                      {toTokenBalance
                        ? formatUnits(
                            toTokenBalance.value,
                            toTokenBalance.decimals,
                          )
                        : '0'}
                    </span>
                  )}
                </div>
                <DialogFooter className="sm:flex-col-reverse sm:justify-center gap-3">
                  <Button
                    size="lg"
                    className="font-brand"
                    type="submit"
                    disabled={
                      swapMutation.isPending ||
                      calculateTradeMutation.isPending ||
                      !form.formState.isValid ||
                      isInsufficientBalance
                    }
                    isLoading={swapMutation.isPending}
                  >
                    {!account?.address
                      ? 'Connect wallet'
                      : !fromToken || !toToken
                        ? 'Select token'
                        : calculateTradeMutation.isPending
                          ? 'Finalizing quote...'
                          : isInsufficientBalance
                            ? `Insufficient ${fromToken}`
                            : 'Swap'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
        {step === 'execute' && (
          <>
            <DialogHeader className="sm:pl-7">
              <DialogTitle>Complete Swap</DialogTitle>
            </DialogHeader>

            <ProgressSteps currentStep={executeStep}>
              <ProgressStep title="Approve">
                <p>Approve token for swap on Biru (one-time only)</p>
                <Button
                  onClick={() => approveMutation.mutate()}
                  size="lg"
                  disabled={approveMutation.isPending}
                  isLoading={approveMutation.isPending}
                  className="font-brand"
                >
                  Approve
                </Button>
              </ProgressStep>
              <ProgressStep title="Swap tokens">
                <p>Sign with your wallet to confirm the swap</p>
                <Button
                  size="lg"
                  onClick={() => swapMutation.mutate()}
                  disabled={swapMutation.isPending}
                  isLoading={swapMutation.isPending}
                  className="font-brand"
                >
                  Swap
                </Button>
              </ProgressStep>
            </ProgressSteps>
          </>
        )}
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Swap successful</DialogTitle>
            </DialogHeader>
            <p>Your token swap has been completed successfully.</p>
            <Separator />
            <div className="flex flex-col items-stretch gap-4">
              <div className="flex justify-between gap-2">
                <span className="font-bold">You paid</span>
                <PriceCell
                  price={calculateTradeMutation?.data?.currencyAmountIn?.toFixed()}
                  symbol={
                    calculateTradeMutation?.data?.currencyAmountIn?.currency
                      ?.symbol
                  }
                  exact
                />
              </div>
              <div className="flex justify-between gap-2">
                <span className="font-bold">You received</span>
                <PriceCell
                  price={calculateTradeMutation?.data?.currencyAmountOut?.toFixed()}
                  symbol={
                    calculateTradeMutation?.data?.currencyAmountOut?.currency
                      ?.symbol
                  }
                  exact
                />
              </div>
            </div>
            <ViewTransactionLink txHash={swapMutation.data?.transactionHash} />
            <DialogFooter>
              <Button
                onClick={() => setIsOpen(false)}
                size="lg"
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
