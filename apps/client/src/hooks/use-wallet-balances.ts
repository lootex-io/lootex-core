import { zeroAddress } from 'viem';
import { useConnection } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { tokens } from '@/lib/tokens';
import { config } from '@/lib/wagmi';
import { getBalance } from '@wagmi/core';

const useWalletBalances = ({
  enabled: _enabled = true,
}: {
  enabled?: boolean;
}) => {
  const { address } = useConnection();

  return useQuery({
    queryKey: ['wallet-balances', address],
    queryFn: async () => {
      try {
        return await Promise.all(
          tokens?.map((token) => {
            const isNative = token.address === zeroAddress;
            return getBalance(config, {
              address: address as `0x${string}`,
              ...(!isNative && { token: token.address as `0x${string}` }),
            });
          }),
        );
      } catch (err) {
        console.error('Error in fetching wallet balances: ', err);
        throw err;
      }
    },
    enabled: !!address && _enabled,
  });
};

export default useWalletBalances;
