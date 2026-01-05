import {
  type Account,
  type Chain,
  type Transport,
  type WalletClient,
  encodeFunctionData,
} from 'viem';
import { createApiClient } from '../../api/api-client';
import type { Client } from '../../client/index';
import { proxyAbi } from '../abi';
import { getLazyMintData, sendTransactionAsync } from '../utils';

export const lazyMint = async ({
  client,
  chainId,
  contractId,
  walletClient,
  assetImageUrl,
  assetName,
  assetDescription,
  amount,
}: {
  client: Client;
  chainId: number;
  contractId: string;
  walletClient: WalletClient<Transport, Chain, Account>;
  assetImageUrl: string;
  assetName: string;
  assetDescription: string;
  amount: number;
}) => {
  const apiClient = createApiClient({
    client,
  });
  const publicClient = client.getPublicClient({ chainId });

  const contract = await apiClient.studio.getCraetedContract({
    contractId,
  });

  await apiClient.studio.updateBlindBox({
    contractId: contract.id,
    isBlindbox: true,
    blindboxUrl: assetImageUrl,
    blindboxName: assetName,
    blindboxDescription: assetDescription,
  });

  // Step 7: Lazy mint
  const blindBox = await apiClient.studio.syncBlindBox({
    contractId: contract.id,
  });

  if (!blindBox?.tokenUri || !blindBox?.blindboxKey)
    throw new Error('Unable to get blindbox tokenUri or blindboxKey');

  const baseURI = `${blindBox.tokenUri}/`;

  const lazyMintData = await getLazyMintData({
    contractAddress: contract.address,
    client: walletClient,
    revealedURI: baseURI,
    key: blindBox.blindboxKey,
    chainId: contract.chainId,
  });

  const lazyMintEncodedData = encodeFunctionData({
    abi: proxyAbi,
    functionName: 'lazyMint',
    args: [BigInt(amount), baseURI, lazyMintData],
  });

  const lazyMintReceipt = await sendTransactionAsync({
    walletClient,
    publicClient,
    to: contract.address,
    data: lazyMintEncodedData,
  });

  return lazyMintReceipt;
};
