import {
  encodeFunctionData,
  erc20Abi,
  erc721Abi,
  isAddressEqual,
  maxInt256,
} from 'viem';
import { erc1155Abi } from '../abi/erc1155.js';
import type { Client } from '../client/index.js';
import { ItemType, type OrderComponents } from './types.js';

export const checkBalancesAndApprovals = async ({
  client,
  accountAddress,
  operator,
  allOrderComponents,
  chainId,
}: {
  client: Client;
  accountAddress: `0x${string}`;
  operator: `0x${string}`;
  allOrderComponents: OrderComponents[];
  chainId: number;
}) => {
  const publicClient = client.getPublicClient({ chainId });

  // unique by token, identifierOrCriteria, itemType
  const uniqueTokens = allOrderComponents
    .flatMap((order) => order.offer)
    .reduce(
      (acc, item) => {
        const existingItem = acc.find(
          (existing) =>
            existing.token === item.token &&
            existing.identifierOrCriteria === item.identifierOrCriteria,
        );

        if (existingItem) {
          existingItem.startAmount = (
            BigInt(existingItem.startAmount) + BigInt(item.startAmount)
          ).toString();
          existingItem.endAmount = (
            BigInt(existingItem.endAmount) + BigInt(item.endAmount)
          ).toString();
          return acc;
        }

        return acc.concat(item);
      },
      [] as (typeof allOrderComponents)[number]['offer'],
    );

  const balancesOfUniqueTokens = await Promise.all(
    uniqueTokens.map(async (item) => {
      if (item.itemType === ItemType.NATIVE) {
        return await publicClient.getBalance({
          address: accountAddress,
        });
      }

      if (item.itemType === ItemType.ERC20) {
        return await publicClient.readContract({
          address: item.token,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [accountAddress],
        });
      }

      if (
        item.itemType === ItemType.ERC721 ||
        item.itemType === ItemType.ERC721_WITH_CRITERIA
      ) {
        const owner = await publicClient.readContract({
          address: item.token,
          abi: erc721Abi,
          functionName: 'ownerOf',
          args: [BigInt(item.identifierOrCriteria)],
        });

        return isAddressEqual(owner, accountAddress) ? 1n : 0n;
      }

      // 1155
      const balance = await publicClient.readContract({
        address: item.token,
        abi: erc1155Abi,
        functionName: 'balanceOf',
        args: [accountAddress, BigInt(item.identifierOrCriteria)],
      });

      return balance;
    }),
  );

  // erc721 and erc1155 tokens' approvals can be combined
  // as we use isApprovedForAll
  const uniqueContracts = uniqueTokens.reduce(
    (acc, item) => {
      const existingContract = acc.find(
        (existing) => existing.token === item.token,
      );

      if (existingContract) {
        return acc;
      }

      return acc.concat(item);
    },
    [] as typeof uniqueTokens,
  );

  const approvalsOfUniqueContracts = await Promise.all(
    uniqueContracts.map(async (item) => {
      if (item.itemType === ItemType.NATIVE) {
        return true;
      }

      if (item.itemType === ItemType.ERC20) {
        const allowance = await publicClient.readContract({
          address: item.token,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [accountAddress, operator],
        });

        return allowance >= BigInt(item.startAmount);
      }

      return await publicClient.readContract({
        address: item.token,
        abi: erc721Abi,
        functionName: 'isApprovedForAll',
        args: [accountAddress, operator],
      });
    }),
  );

  const approvalActions = approvalsOfUniqueContracts
    .map((approval, index) => {
      if (!approval) {
        const item = uniqueContracts[index];
        return {
          type: 'approve' as const,
          token: item.token,
          identifierOrCriteria: item.identifierOrCriteria,
          itemType: item.itemType,
          operator,
          buildTransaction: async () => {
            if (item.itemType === ItemType.ERC20) {
              return {
                to: item.token,
                data: encodeFunctionData({
                  abi: erc20Abi,
                  functionName: 'approve',
                  args: [operator, maxInt256],
                }),
              };
            }

            return {
              to: item.token,
              data: encodeFunctionData({
                abi: erc721Abi,
                functionName: 'setApprovalForAll',
                args: [operator, true],
              }),
            };
          },
        };
      }
      return undefined;
    })
    .filter((item) => item !== undefined);

  return {
    uniqueTokens,
    balancesOfUniqueTokens,
    uniqueContracts,
    approvalsOfUniqueContracts,
    approvalActions,
  };
};
