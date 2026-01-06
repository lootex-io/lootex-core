import { zeroHash } from 'viem';
import { createApiClient } from '../api/api-client';
import type { GetCollectionDropInfoResponse } from '../api/endpoints/collection';
import type { Client } from '../client/index';
import { dropAbi, dropErc1155Abi } from './abi';

export type GetDropResult = {
  dropInfo: {
    chainId: number;
  } & GetCollectionDropInfoResponse;
  conditions: {
    isBetweenPhases: boolean;
    hasNextPhase: boolean;
    max: number;
    totalMinted: number;
    percentage: number;
    isStarted: boolean;
    isEnded: boolean;
    isSoldOut: boolean;
    remainingSupply: bigint;
    pricePerToken: bigint;
    quantityLimitPerWallet: bigint;
    maxClaimableSupply: bigint;
    startTimestamp: bigint;
    metadata: string;
    currency: `0x${string}`;
    supplyClaimed: bigint;
    merkleRoot: `0x${string}`;
    currentConditionId: number;
    displayConditionId: number;
  };
};

export const getDrop = async ({
  chainId,
  contractAddress,
  collectionSlug,
  client,
  dropInfo,
  tokenId,
}: {
  chainId: number;
  contractAddress: `0x${string}`;
  collectionSlug: string;
  client: Client;
  dropInfo?: GetCollectionDropInfoResponse;
  isErc1155?: boolean;
  tokenId?: number;
}): Promise<GetDropResult> => {
  if (!contractAddress) throw new Error('No contract address provided');
  if (!chainId) throw new Error('No chain id provided');

  const isErc1155 = tokenId !== undefined;

  const apiClient = createApiClient({
    client,
  });

  const publicClient = client.getPublicClient({ chainId });

  const info =
    dropInfo ??
    (await apiClient.collections.getCollectionDropInfo({
      slug: collectionSlug,
      ...(isErc1155 ? { tokenId } : {}),
    }));

  // 1. Get basic contract data
  const [_totalMinted, [, count]] = isErc1155
    ? await Promise.all([
        publicClient.readContract({
          abi: dropErc1155Abi,
          address: contractAddress,
          functionName: 'totalSupply',
          args: [BigInt(tokenId)],
        }),
        publicClient.readContract({
          abi: dropErc1155Abi,
          address: contractAddress,
          functionName: 'claimCondition',
          args: [BigInt(tokenId)],
        }),
      ])
    : await Promise.all([
        publicClient.readContract({
          abi: dropAbi,
          address: contractAddress,
          functionName: 'totalMinted',
        }),
        publicClient.readContract({
          abi: dropAbi,
          address: contractAddress,
          functionName: 'claimCondition',
        }),
      ]);

  // 2. Get all conditions
  const conditions = isErc1155
    ? await Promise.all(
        Array.from({ length: Number(count) }, (_, i) =>
          publicClient.readContract({
            abi: dropErc1155Abi,
            address: contractAddress,
            functionName: 'getClaimConditionById',
            args: [BigInt(tokenId), BigInt(i)],
          }),
        ),
      )
    : await Promise.all(
        Array.from({ length: Number(count) }, (_, i) =>
          publicClient.readContract({
            abi: dropAbi,
            address: contractAddress,
            functionName: 'getClaimConditionById',
            args: [BigInt(i)],
          }),
        ),
      );

  // 3. Find current active phase
  const now = Math.floor(Date.now() / 1000);
  const currentPhase = conditions.reduce((latestPhase, condition, index) => {
    const startTime = Number(condition?.startTimestamp ?? 0n);
    if (startTime > 0 && now >= startTime) {
      return index;
    }
    return latestPhase;
  }, -1);

  const currentConditionId = currentPhase === -1 ? 0 : currentPhase;
  const currentCondition = conditions[currentConditionId];

  // 4. Check phase status
  const currentMax = Number(currentCondition?.maxClaimableSupply ?? 0) ?? 0;
  const totalMinted = Number(_totalMinted) ?? 0;
  const isCurrentPhaseEnded =
    currentCondition?.startTimestamp !== 0n &&
    currentCondition?.quantityLimitPerWallet === 0n &&
    currentCondition?.merkleRoot === zeroHash;
  const isCurrentPhaseSoldOut = totalMinted === currentMax;

  // 5. Determine if we should show next phase
  const hasNextPhase = currentConditionId < Number(count) - 1;
  const isBetweenPhases =
    hasNextPhase && (isCurrentPhaseEnded || isCurrentPhaseSoldOut);

  // 6. Select the condition to display
  const displayConditionId = isBetweenPhases
    ? currentConditionId + 1
    : currentConditionId;
  const displayCondition = conditions[displayConditionId];

  // 7. Calculate display values
  const max = Number(displayCondition?.maxClaimableSupply ?? 0) ?? 0;
  const percentage =
    max === 0 && totalMinted === 0
      ? 0
      : Math.floor((totalMinted / max) * 1000) / 10;

  const isStarted = displayCondition?.startTimestamp
    ? new Date() > new Date(Number(displayCondition?.startTimestamp) * 1000)
    : false;

  const remainingSupply = BigInt(max - totalMinted);

  return {
    dropInfo: { ...info, chainId },
    conditions: {
      isBetweenPhases,
      hasNextPhase,
      max,
      totalMinted,
      percentage,
      isStarted,
      isEnded: isCurrentPhaseEnded,
      isSoldOut: isCurrentPhaseSoldOut,
      remainingSupply,
      currentConditionId,
      displayConditionId,
      ...displayCondition,
    },
  };
};
