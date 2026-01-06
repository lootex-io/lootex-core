import {
  encodeFunctionData,
  erc20Abi,
  maxInt256,
  parseUnits,
  zeroAddress,
} from 'viem';
import type { Client } from '../client/index';
import type { TransactionData } from '../utils/transaction';
import { dropAbi, dropErc1155Abi } from './abi';
import type { GetDropResult } from './get-drop';
import type { WhitelistInfo } from './prepare-mint';

const nativeTokenPlaceholder = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export type MintResult = {
  quantity: number;
  actions: {
    type: 'approve' | 'mint';
    buildTransaction: () => Promise<TransactionData>;
  }[];
};

export const mint = async ({
  client,
  drop,
  walletAddress,
  recipientAddress,
  whitelistData,
  isWhitelistMint,
  quantity,
  tokenId,
}: {
  client: Client;
  drop: GetDropResult;
  walletAddress: `0x${string}`;
  recipientAddress?: `0x${string}`;
  isWhitelistMint: boolean;
  quantity: number;
  whitelistData: WhitelistInfo;
  tokenId?: bigint;
}): Promise<MintResult> => {
  if (!walletAddress) throw new Error('No account address');
  if (!quantity) throw new Error('No quantity');
  if (!whitelistData) throw new Error('Whitelist check failed');

  const isErc1155 = tokenId !== undefined;

  const {
    conditions: { currency },
    dropInfo: {
      contract: { address },
    },
  } = drop;

  const publicClient = client.getPublicClient({
    chainId: drop.dropInfo.chainId,
  });

  const _pricePerToken = isWhitelistMint
    ? parseUnits(
        whitelistData.whitelistPrice,
        whitelistData.whitelistCurrency.decimals,
      )
    : drop.conditions.pricePerToken;

  const totalPrice = _pricePerToken * BigInt(quantity);

  const isNativeCurrency =
    currency === zeroAddress || currency === nativeTokenPlaceholder;

  const actions = [];

  // check approval

  if (!isNativeCurrency) {
    const allowance = await publicClient.readContract({
      abi: erc20Abi,
      address: currency,
      functionName: 'allowance',
      args: [walletAddress, address],
    });

    if (allowance < totalPrice) {
      actions.push({
        type: 'approve',
        buildTransaction: async () => ({
          to: currency,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [address, maxInt256],
          }),
        }),
      } as const);
    }
  }

  const proof = isWhitelistMint
    ? {
        proof: whitelistData.whitelistMerkleProof,
        quantityLimitPerWallet: BigInt(whitelistData.whitelistLimitAmount),
        pricePerToken: _pricePerToken,
        currency: isNativeCurrency ? nativeTokenPlaceholder : currency,
      }
    : {
        proof: [
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        ] as `0x${string}`[],
        quantityLimitPerWallet: drop.conditions.quantityLimitPerWallet,
        pricePerToken: _pricePerToken,
        currency: isNativeCurrency ? nativeTokenPlaceholder : currency,
      };

  actions.push({
    type: 'mint',
    buildTransaction: async () => ({
      to: address,
      data: isErc1155
        ? encodeFunctionData({
            abi: dropErc1155Abi,
            functionName: 'claim',
            args: [
              recipientAddress ?? walletAddress,
              tokenId,
              BigInt(quantity),
              isNativeCurrency ? nativeTokenPlaceholder : currency,
              _pricePerToken,
              proof,
              '0x',
            ],
          })
        : encodeFunctionData({
            abi: dropAbi,
            functionName: 'claim',
            args: [
              recipientAddress ?? walletAddress,
              BigInt(quantity),
              isNativeCurrency ? nativeTokenPlaceholder : currency,
              _pricePerToken,
              proof,
              '0x',
            ],
          }),
      value: isNativeCurrency ? totalPrice : undefined,
    }),
  } as const);

  return {
    quantity,
    actions,
  };
};
