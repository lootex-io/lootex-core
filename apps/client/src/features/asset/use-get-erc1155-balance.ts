import { lootex } from '@/lib/lootex';
import { defaultChain } from '@/lib/wagmi';
import { useQuery } from '@tanstack/react-query';
import { erc1155Abi } from '@lootex-core/sdk/abi';
import { type Asset, isErc1155Asset } from '@lootex-core/sdk/asset';

export const useGetErc1155Balance = ({
  asset,
  accountAddress,
}: {
  asset?: Asset;
  accountAddress?: `0x${string}`;
}) => {
  const isErc1155 = isErc1155Asset(asset);

  return useQuery({
    queryKey: [
      'asset-erc1155-balance',
      {
        contractAddress: asset?.contractAddress,
        tokenId: asset?.assetTokenId,
        accountAddress: accountAddress,
      },
    ],
    queryFn: async () => {
      const publicClient = lootex.getPublicClient({
        chainId: defaultChain.id,
      });

      if (!accountAddress || !asset?.contractAddress || !asset?.assetTokenId) {
        return false;
      }

      const balance = await publicClient.readContract({
        address: asset?.contractAddress as `0x${string}`,
        abi: erc1155Abi,
        functionName: 'balanceOf',
        args: [accountAddress, BigInt(asset?.assetTokenId)],
      });

      return balance;
    },
    enabled:
      !!asset?.contractAddress &&
      !!asset?.assetTokenId &&
      !!accountAddress &&
      isErc1155,
  });
};
