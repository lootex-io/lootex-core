import { ViewTransactionLink } from '@/components/view-transaction-link';
import { useToast } from '@/hooks/use-toast';
import { config, defaultChain } from '@/lib/wagmi';
import { useMutation } from '@tanstack/react-query';
import { waitForTransactionReceipt } from '@wagmi/core';
import {
  useSendTransaction as useSendTransactionWagmi,
  useConnection,
} from 'wagmi';

export const useSendTransaction = () => {
  const { address, chain } = useConnection();
  const mutation = useSendTransactionWagmi();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      to,
      data,
      value,
    }: {
      to: `0x${string}`;
      data?: `0x${string}`;
      value?: bigint;
    }) => {
      if (!address) {
        throw new Error('Account not found. Please connect your wallet.');
      }

      if (chain?.id !== defaultChain.id) {
        throw new Error(
          `Please switch to ${defaultChain.name} network before sending a transaction`,
        );
      }

      const hash = await mutation.mutateAsync({
        to,
        data,
        value,
      });

      toast({
        title: 'Transaction Submitted',
        description: (
          <p>
            Please wait for the transaction to be confirmed on Soneium Mainnet.
            <ViewTransactionLink txHash={hash} />
          </p>
        ),
      });

      const receipt = await waitForTransactionReceipt(config, { hash });

      toast({
        title: 'Transaction Confirmed',
        description: <ViewTransactionLink txHash={receipt.transactionHash} />,
      });

      return receipt;
    },
  });
};
