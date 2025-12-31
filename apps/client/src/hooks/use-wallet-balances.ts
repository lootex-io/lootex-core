import { zeroAddress, formatUnits, erc20Abi } from 'viem';
import { useChainId, useConnection } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { tokens, type EnhancedToken } from '@/lib/tokens';
import { config } from '@/lib/wagmi';
import { getBalance, readContract } from '@wagmi/core';

type TokenBalance = {
  token: EnhancedToken;
  raw: bigint;
  formatted: string;
};

const useWalletBalances = ({
  enabled: _enabled = true,
}: {
  enabled?: boolean;
}) => {
  const { address } = useConnection();
  const chainId = useChainId();

  return useQuery<TokenBalance[]>({
    queryKey: ['wallet-balances', address, chainId],
    queryFn: async () => {
      if (!address || !chainId) return [];
      try {
        const chainTokens = tokens.filter((t) => t.chainId === chainId);
        const results: TokenBalance[] = [];

        for (const token of chainTokens) {
          // 1. Native token: address === zeroAddress
          if (token.address === zeroAddress) {
            const bal = await getBalance(config, {
              address,
              chainId: chainId as (typeof config.chains)[number]['id'],
            });

            results.push({
              token,
              raw: bal.value,
              formatted: formatUnits(bal.value, bal.decimals),
            });

            continue;
          }

          // 2. ERC20 / wrapped token
          const raw = await readContract(config, {
            address: token.address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address],
          });

          results.push({
            token,
            raw,
            formatted: formatUnits(raw, token.decimals),
          });
        }

        return results;
      } catch (err) {
        console.error('Error fetching wallet balances:', err);
        throw err;
      }
    },
    enabled: !!address && !!chainId && _enabled,
  });
};

export default useWalletBalances;
