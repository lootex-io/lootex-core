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
import { Input } from '@/components/ui/input';
import { ProgressStep, ProgressSteps } from '@/components/ui/progress-steps';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiClient, lootex } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type Asset, batchTransfer } from '@lootex-core/sdk/asset';
import { FlameIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { isAddress } from 'viem';
import { useConnection } from 'wagmi';
import { useSelectionStore } from '../collection-browser/selection-store';
import { useSendTransaction } from '../wallet/use-send-transaction';
const burnAddress = '0x000000000000000000000000000000000000dEaD';

// ...

export const TransferModal = ({
  isOpen,
  setIsOpen,
  assets,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  assets?: Asset[];
}) => {
  const [type, setType] = useState<'transfer' | 'burn'>('transfer');
  const [toAddress, setToAddress] = useState('');
  const [isConfirmedTransfer, setIsConfirmedTransfer] = useState(false);
  const [isConfirmedBurn, setIsConfirmedBurn] = useState(false);

  const selectionStore = useSelectionStore();
  const { address } = useConnection();
  const account = address ? { address } : undefined;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'form' | 'execute' | 'success'>('form');
  const [executeStep, setExecuteStep] = useState(1);

  const isValidAddress = useMemo(() => {
    return isAddress(toAddress);
  }, [toAddress]);

  const prepareBatchTransferMutation = useMutation({
    mutationFn: async () => {
      if (!account?.address) {
        throw new Error('No account found');
      }

      if (!assets) {
        throw new Error('No assets found');
      }

      if (type === 'transfer' && !isAddress(toAddress)) {
        throw new Error('Invalid recipient address');
      }

      return await batchTransfer({
        client: lootex,
        chainId: defaultChain.id,
        from: account?.address as `0x${string}`,
        to: type === 'transfer' ? (toAddress as `0x${string}`) : burnAddress,
        assets: assets,
      });
    },
    onSuccess: (data) => {
      if (
        // If there are no approve actions, we can skip the approval step
        data.actions.filter((action) => action.type === 'approve').length === 0
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

  const { mutateAsync: sendTransactionAsync } = useSendTransaction();

  const approveActions = prepareBatchTransferMutation.data?.actions.filter(
    (action) => action.type === 'approve',
  );

  const batchTransferAction = prepareBatchTransferMutation.data?.actions.find(
    (action) => action.type === 'batchTransfer',
  );

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

  const batchTransferMutation = useMutation({
    mutationFn: async () => {
      if (!batchTransferAction) {
        throw new Error('No batch transfer action found');
      }

      const tx = await batchTransferAction.buildTransaction();

      return await sendTransactionAsync(tx);
    },
    onSuccess: async (txReceipt) => {
      try {
        await apiClient.request({
          method: 'PUT',
          path: `/v3/orders/sync/${defaultChain.id}/${txReceipt.transactionHash}`,
        });
      } catch (error) {
        console.error(error);
      }

      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      queryClient.invalidateQueries({ queryKey: ['nfts'] });
      selectionStore.clear();

      setStep('success');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const [completedApprovals, setCompletedApprovals] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setType('transfer');
      setToAddress('');
      setCompletedApprovals(0);
      setExecuteStep(1);
      setIsConfirmedTransfer(false);
      setIsConfirmedBurn(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        {step === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Create Transfer</DialogTitle>
            </DialogHeader>
            <OrderDetails
              items={assets?.map((asset) => ({
                id: asset.id,
                imageUrl: asset.assetImageUrl ?? '',
                subtitle: asset.assetName ?? '',
                title: `#${asset.assetTokenId}`,
                price: '',
                symbol: '',
              }))}
              isOpen={true}
            />

            <Tabs
              defaultValue={type}
              onValueChange={(value) => setType(value as 'transfer' | 'burn')}
            >
              <TabsList className="">
                <TabsTrigger value="transfer">Transfer</TabsTrigger>
                <TabsTrigger value="burn">Burn</TabsTrigger>
              </TabsList>
              <TabsContent value="transfer" className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold">Address</span>
                  <Input
                    placeholder="Enter recipient address"
                    type="text"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="transfer-confirm"
                    className="h-4 w-4"
                    onChange={(e) => setIsConfirmedTransfer(e.target.checked)}
                    checked={isConfirmedTransfer}
                  />
                  <label htmlFor="transfer-confirm" className="text-sm">
                    I understand this action is irreversible and confirm that
                    the recipient address is correct.
                  </label>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => prepareBatchTransferMutation.mutate()}
                    className="font-brand"
                    disabled={
                      !isValidAddress ||
                      !isConfirmedTransfer ||
                      prepareBatchTransferMutation.isPending
                    }
                    isLoading={prepareBatchTransferMutation.isPending}
                  >
                    Transfer
                  </Button>
                </DialogFooter>
              </TabsContent>
              <TabsContent value="burn" className="flex flex-col gap-4">
                <Alert variant="destructive">
                  <AlertTitle className="text-base font-bold">
                    Warning
                  </AlertTitle>
                  <AlertDescription>
                    Once burned, these NFTs will be permanently destroyed and
                    cannot be recovered.
                  </AlertDescription>
                </Alert>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="burn-confirm"
                    className="h-4 w-4"
                    onChange={(e) => setIsConfirmedBurn(e.target.checked)}
                    checked={isConfirmedBurn}
                  />
                  <label htmlFor="burn-confirm" className="text-sm">
                    I confirm that I want to permanently burn these items
                  </label>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="font-brand"
                    variant="destructive"
                    onClick={() => prepareBatchTransferMutation.mutate()}
                    disabled={
                      !isConfirmedBurn || prepareBatchTransferMutation.isPending
                    }
                    isLoading={prepareBatchTransferMutation.isPending}
                  >
                    Burn
                    <FlameIcon className="w-4 h-4" />
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </>
        )}
        {step === 'execute' && (
          <>
            <DialogHeader>
              <DialogTitle>Submit Transfer</DialogTitle>
            </DialogHeader>

            <ProgressSteps currentStep={executeStep}>
              <ProgressStep title="Approve Collection">
                <p>Approve collections for batch transfer (one-time only)</p>
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
              <ProgressStep title="Transfer">
                <p>Sign with your wallet to confirm the transfer of your NFT</p>
                <Button
                  size="lg"
                  onClick={() => batchTransferMutation.mutate()}
                  disabled={batchTransferMutation.isPending}
                  isLoading={batchTransferMutation.isPending}
                  className="font-brand"
                >
                  Transfer
                </Button>
              </ProgressStep>
            </ProgressSteps>
          </>
        )}
        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Transfer Completed Successfully</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-stretch gap-4">
              <p className="text-gray-600">
                Congratulations! You have successfully transferred{' '}
                {assets?.length} items.
              </p>
              <OrderDetails
                items={assets?.map((asset) => ({
                  id: asset.id,
                  imageUrl: asset.assetImageUrl ?? '',
                  price: '',
                  symbol: '',
                  title: `#${asset.assetTokenId}`,
                  subtitle: asset.assetName ?? '',
                }))}
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
