import { encodeFunctionData, erc20Abi, erc721Abi, isAddressEqual } from 'viem';
import { erc1155Abi } from '../../abi/erc1155';
import type { Client } from '../../client/index';
import type { LootexOfferItem, LootexOrder } from '../../order/types';
import { SEAPORT_1_6_ABI } from '../../seaport/abi';
import { OPENSEA_CONDUIT_ADDRESS } from '../../seaport/constants';
import { ItemType } from '../../seaport/types';
import { seaportAddresses } from '../constants';

export const checkIsOrderFulfillable = async ({
  order,
  client,
  chainId,
}: {
  order: LootexOrder;
  client: Client;
  chainId: number;
}) => {
  const offerer = order?.seaportOrder.parameters.offerer as `0x${string}`;
  const offerItems = order?.seaportOrder.parameters.offer;
  const operator =
    order.platformType === 1 ? OPENSEA_CONDUIT_ADDRESS : order.exchangeAddress;

  const [balances, approvals, status] = await Promise.all([
    checkBalances({ client, owner: offerer, items: offerItems, chainId }),
    checkApprovals({
      client,
      owner: offerer,
      operator,
      items: offerItems,
      chainId,
    }),
    checkOrderStatus({ client, order, chainId }),
  ]);

  return (
    balances.every((balance) => !!balance) &&
    approvals.every((approval) => !!approval) &&
    !!status
  );
};

export const checkBalances = async ({
  client,
  owner,
  items,
  chainId,
}: {
  client: Client;
  owner: `0x${string}`;
  items: LootexOfferItem[];
  chainId: number;
}) => {
  return await Promise.all(
    items.map(async (item) => {
      const itemType = item.itemType;
      const identifier = item.identifierOrCriteria;
      const amount = BigInt(item.availableAmount ?? item.startAmount);

      if (itemType === ItemType.NATIVE) {
        const balance = await client.getPublicClient({ chainId }).getBalance({
          address: owner,
        });

        return balance >= amount;
      }
      if (itemType === ItemType.ERC20) {
        const balance = await client.getPublicClient({ chainId }).readContract({
          abi: erc20Abi,
          address: item.token as `0x${string}`,
          functionName: 'balanceOf',
          args: [owner],
        });

        return balance >= amount;
      }
      if (
        itemType === ItemType.ERC1155 ||
        itemType === ItemType.ERC1155_WITH_CRITERIA
      ) {
        const balance = await client.getPublicClient({ chainId }).readContract({
          abi: erc1155Abi,
          address: item.token as `0x${string}`,
          functionName: 'balanceOf',
          args: [owner, BigInt(identifier)],
        });

        return balance >= amount;
      }
      // ERC721
      const _owner = await client.getPublicClient({ chainId }).readContract({
        abi: erc721Abi,
        address: item.token as `0x${string}`,
        functionName: 'ownerOf',
        args: [BigInt(identifier)],
      });

      return isAddressEqual(owner, _owner);
    }),
  );
};

export const checkApprovals = async ({
  client,
  owner,
  operator,
  items,
  chainId,
}: {
  client: Client;
  owner: `0x${string}`;
  operator: `0x${string}`;
  items: LootexOfferItem[];
  chainId: number;
}) => {
  return await Promise.all(
    items.map(async (item) => {
      const itemType = item.itemType;
      const amount = item.availableAmount ?? item.startAmount;

      if (itemType === ItemType.NATIVE) {
        return true;
      }
      if (itemType === ItemType.ERC20) {
        const allowance = await client
          .getPublicClient({ chainId })
          .readContract({
            abi: erc20Abi,
            address: item.token as `0x${string}`,
            functionName: 'allowance',
            args: [owner, operator],
          });

        return allowance >= BigInt(amount);
      }
      // ERC721 or ERC1155
      const isApprovedForAll = await client
        .getPublicClient({ chainId })
        .readContract({
          abi: erc721Abi,
          address: item.token as `0x${string}`,
          functionName: 'isApprovedForAll',
          args: [owner, operator],
        });

      return isApprovedForAll;
    }),
  );
};

export const checkOrderStatus = async ({
  client,
  order,
  chainId,
}: {
  client: Client;
  order: LootexOrder;
  chainId: number;
}) => {
  const [, isCancelled, totalFilled, totalSize] = await client
    .getPublicClient({ chainId })
    .readContract({
      address: order.exchangeAddress,
      abi: SEAPORT_1_6_ABI,
      functionName: 'getOrderStatus',
      args: [order.hash],
    });

  if (isCancelled && totalFilled === totalSize) {
    return false;
  }
  return true;
};

export const simulateValidateOrder = async ({
  client,
  order,
  chainId,
}: {
  client: Client;
  order: LootexOrder;
  chainId: number;
}) => {
  try {
    await client.getPublicClient({ chainId }).call({
      to: seaportAddresses[chainId],
      data: encodeFunctionData({
        abi: SEAPORT_1_6_ABI,
        functionName: 'validate',
        // @ts-ignore
        args: [[order.seaportOrder]],
      }),
    });

    return true;
  } catch (error) {
    return false;
  }
};
