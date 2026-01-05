import { parseUnits, zeroHash } from 'viem';
import { createApiClient } from '../api/api-client';
import type { Client } from '../client/index';
import { dropAbi, dropErc1155Abi } from './abi';
import type { GetDropResult } from './get-drop';

export type WhitelistInfo = {
  isWhitelisted: boolean;
  whitelistLimitAmount: number;
  whitelistPrice: string;
  whitelistCurrency: {
    address: `0x${string}`;
    decimals: number;
    symbol: string;
  };
  whitelistMerkleProof: `0x${string}`[];
};

export type PrepareMintResult = {
  unitPrice: bigint;
  maxMintableAmount: bigint;
  availableAmount: bigint;
  proof: `0x${string}`[];
  whitelistData: WhitelistInfo;
  isWhitelistMint: boolean;
  limitPerWallet?: bigint;
};

const getMintedAmountOfWallet = async ({
  client,
  drop,
  walletAddress,
  conditionId,
  tokenId,
}: {
  client: Client;
  drop: GetDropResult;
  walletAddress: `0x${string}`;
  conditionId: bigint;
  tokenId?: bigint;
}): Promise<bigint> => {
  const {
    dropInfo: {
      chainId,
      contract: { address },
    },
  } = drop;
  const publicClient = client.getPublicClient({ chainId });
  const isErc1155 = tokenId !== undefined;

  return isErc1155
    ? await publicClient.readContract({
        abi: dropErc1155Abi,
        address,
        functionName: 'getSupplyClaimedByWallet',
        args: [
          tokenId,
          conditionId, // claim condition id, change this if have multiple conditions
          walletAddress,
        ],
      })
    : await publicClient.readContract({
        abi: dropAbi,
        address,
        functionName: 'getSupplyClaimedByWallet',
        args: [
          conditionId, // claim condition id, change this if have multiple conditions
          walletAddress,
        ],
      });
};

export const getWhitelistInfoOfWallet = async ({
  client,
  drop,
  walletAddress,
  tokenId,
}: {
  client: Client;
  drop: GetDropResult;
  walletAddress: `0x${string}`;
  tokenId?: bigint;
}): Promise<WhitelistInfo> => {
  const {
    dropInfo: {
      contract: { id: contractId, drops },
    },
    conditions: { startTimestamp, currentConditionId },
  } = drop;

  const currentCondition = drops?.[currentConditionId];

  if (!contractId) throw new Error('No contract id provided');
  if (!currentCondition) throw new Error('Condition not found');

  const apiClient = createApiClient({
    client,
  });

  const { isWhitelisted, limitAmount, value, merkleProof } =
    await apiClient.studio.getWhitelistProof({
      contractId,
      dropId: currentCondition.id,
      walletAddress,
      ...(tokenId !== undefined && { tokenId: Number(tokenId) }),
    });

  return {
    isWhitelisted,
    whitelistLimitAmount: Number(limitAmount ?? 0),
    whitelistPrice: value ?? '0',
    whitelistCurrency: currentCondition?.currency,
    whitelistMerkleProof: merkleProof,
  };
};

export const prepareMint = async ({
  client,
  drop,
  conditionId,
  tokenId,
  walletAddress,
}: {
  client: Client;
  drop: GetDropResult;
  conditionId: bigint;
  tokenId?: bigint;
  walletAddress: `0x${string}`;
}): Promise<PrepareMintResult> => {
  const mintedAmount = await getMintedAmountOfWallet({
    client,
    drop,
    walletAddress,
    conditionId,
    tokenId,
  });

  const whitelistInfo = await getWhitelistInfoOfWallet({
    client,
    drop,
    walletAddress,
    tokenId,
  });

  const {
    isWhitelisted,
    whitelistLimitAmount,
    whitelistPrice,
    whitelistCurrency,
    whitelistMerkleProof,
  } = whitelistInfo;
  const {
    pricePerToken,
    quantityLimitPerWallet,
    remainingSupply,
    maxClaimableSupply,
  } = drop.conditions;

  // Calculate unit price
  const unitPrice = isWhitelisted
    ? (BigInt(mintedAmount) >= BigInt(whitelistLimitAmount) && pricePerToken) ||
      parseUnits(whitelistPrice, whitelistCurrency.decimals)
    : pricePerToken;

  // Calculate max mintable amount
  const baseMaxPerMint =
    quantityLimitPerWallet > 100n
      ? 100n
      : (BigInt(mintedAmount) >= BigInt(quantityLimitPerWallet) && 1n) ||
        BigInt(quantityLimitPerWallet) - BigInt(mintedAmount);

  const whitelistMaxPerMint =
    BigInt(whitelistLimitAmount) > 100n
      ? 100n
      : BigInt(mintedAmount) >= BigInt(whitelistLimitAmount)
        ? 1n
        : BigInt(whitelistLimitAmount) - BigInt(mintedAmount);

  const maxMintableAmount = isWhitelisted
    ? whitelistMaxPerMint > remainingSupply
      ? remainingSupply
      : whitelistMaxPerMint
    : baseMaxPerMint > remainingSupply
      ? remainingSupply
      : baseMaxPerMint;

  // Calculate available amount
  const baseAvailableAmount =
    BigInt(mintedAmount) >= BigInt(quantityLimitPerWallet)
      ? 0n
      : BigInt(quantityLimitPerWallet) - BigInt(mintedAmount);

  const whitelistAvailableAmount =
    BigInt(mintedAmount) >= BigInt(whitelistLimitAmount)
      ? (BigInt(mintedAmount) >= BigInt(quantityLimitPerWallet) && 0n) ||
        BigInt(quantityLimitPerWallet) - BigInt(mintedAmount)
      : BigInt(whitelistLimitAmount) - BigInt(mintedAmount);

  const availableAmount = isWhitelisted
    ? whitelistAvailableAmount
    : baseAvailableAmount;

  // Calculate proof
  let proof: `0x${string}`[] = [zeroHash];
  if (isWhitelisted && BigInt(mintedAmount) < BigInt(whitelistLimitAmount)) {
    proof = whitelistMerkleProof;
  }

  const isWhitelistMint =
    isWhitelisted && BigInt(mintedAmount) < BigInt(whitelistLimitAmount);

  // undefined means unlimited
  const limitPerWallet = isWhitelisted
    ? (BigInt(whitelistLimitAmount) === maxClaimableSupply && undefined) ||
      (BigInt(mintedAmount) < BigInt(whitelistLimitAmount)
        ? BigInt(whitelistLimitAmount)
        : BigInt(quantityLimitPerWallet ?? BigInt(0)))
    : quantityLimitPerWallet === maxClaimableSupply
      ? undefined
      : BigInt(quantityLimitPerWallet ?? BigInt(0));

  return {
    unitPrice,
    maxMintableAmount,
    availableAmount,
    proof,
    whitelistData: whitelistInfo,
    isWhitelistMint,
    limitPerWallet,
  };
};
