import { encodeFunctionData, erc721Abi } from 'viem';
import { batchTransferAbi } from '../abi/batch-transfer';
import { erc1155Abi } from '../abi/erc1155';
import type { Client } from '../client/index';
import type { TransactionData } from '../utils/transaction';
import { batchTransferConfigs } from './constants';
import { isErc721Asset } from './helpers';
import type { Asset } from './types';

export type BatchTransferApproveAction = {
  type: 'approve';
  operator: `0x${string}`;
  token: `0x${string}`;
  buildTransaction: () => Promise<TransactionData>;
};

export type BatchTransferAction = {
  type: 'batchTransfer';
  assets: Asset[];
  recipient: `0x${string}`;
  buildTransaction: () => Promise<TransactionData>;
};

export type BatchTransferExecution = {
  actions: (BatchTransferApproveAction | BatchTransferAction)[];
};

export const batchTransfer = async ({
  client,
  chainId,
  from,
  to,
  assets,
}: {
  client: Client;
  chainId: number;
  from: `0x${string}`;
  to: `0x${string}`;
  assets: Asset[];
}): Promise<BatchTransferExecution> => {
  const batchTransferConfig = batchTransferConfigs[chainId];
  if (!batchTransferConfig) {
    throw new Error(`Batch transfer is not supported on chainId: ${chainId}`);
  }
  const { entryPoint, conduit, conduitKey } = batchTransferConfig;

  if (assets.length === 0) {
    return { actions: [] };
  }

  // single asset transfers bypass approval checks and bulk transfer for efficiency
  if (assets.length === 1) {
    const asset = assets[0];
    const isERC721 = isErc721Asset(asset);
    return {
      actions: [
        {
          type: 'batchTransfer',
          assets,
          recipient: to,
          buildTransaction: async () => ({
            to: asset.collectionContractAddress,
            data: encodeFunctionData({
              abi: isERC721 ? erc721Abi : erc1155Abi,
              functionName: 'safeTransferFrom',
              args: isERC721
                ? [from, to, BigInt(asset.assetTokenId)]
                : [from, to, BigInt(asset.assetTokenId), 1n, '0x'],
            }),
          }),
        },
      ],
    };
  }

  // as we check isApprovedForAll for each contract address, we need to get unique contract addresses
  const uniqueContractAddresses = [
    ...new Set(assets.map((asset) => asset.collectionContractAddress)),
  ];

  const approvals = await Promise.all(
    uniqueContractAddresses.map(async (contractAddress) => {
      const isApprovedForAll = await client
        .getPublicClient({ chainId })
        .readContract({
          address: contractAddress,
          abi: erc721Abi, // same for erc1155
          functionName: 'isApprovedForAll',
          args: [from, conduit],
        });

      return {
        isApprovedForAll,
        contractAddress,
      };
    }),
  );

  const approvalActions: BatchTransferApproveAction[] = approvals
    .filter(({ isApprovedForAll }) => !isApprovedForAll)
    .map(({ contractAddress }) => {
      return {
        type: 'approve',
        operator: conduit,
        token: contractAddress,
        buildTransaction: async () => ({
          to: contractAddress,
          data: encodeFunctionData({
            abi: erc721Abi,
            functionName: 'setApprovalForAll',
            args: [conduit, true],
          }),
        }),
      };
    });

  const transfers = assets.map((asset) => {
    const isERC721 = isErc721Asset(asset);
    const itemType = isERC721 ? 2 : 3;
    const token = asset.contractAddress;
    const identifier = BigInt(asset.assetTokenId);
    const amount = 1n;

    return { itemType, token, identifier, amount };
  });

  const transferAction: BatchTransferAction = {
    type: 'batchTransfer',
    assets,
    recipient: to,
    buildTransaction: async () => ({
      to: entryPoint,
      data: encodeFunctionData({
        abi: batchTransferAbi,
        functionName: 'bulkTransfer',
        args: [
          [
            {
              items: transfers,
              recipient: to,
              validateERC721Receiver: true,
            },
          ],
          conduitKey,
        ],
      }),
    }),
  };

  return {
    actions: [...approvalActions, transferAction],
    // For now we only return the actions
    // There might be more methods of execution here
  };
};
