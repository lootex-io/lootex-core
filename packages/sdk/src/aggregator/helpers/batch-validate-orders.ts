import { erc20Abi } from '../../abi/erc20.js';
import { erc721Abi } from '../../abi/erc721.js';
import { erc1155Abi } from '../../abi/erc1155.js';
import type { Client } from '../../client/index.js';
import type { LootexOfferItem, LootexOrder } from '../../order/types.js';
import { OPENSEA_CONDUIT_ADDRESS } from '../../seaport/constants.js';

// optimized for multicall
export const batchValidateOrders = async ({
  client,
  orders,
}: {
  client: Client;
  orders: LootexOrder[];
}) => {
  const publicClient = client.getPublicClient({ chainId: orders[0].chainId });

  const allOfferItems = orders.reduce(
    (acc, order) => {
      const owner = order.seaportOrder.parameters.offerer as `0x${string}`;
      const operator =
        order.platformType === 1
          ? OPENSEA_CONDUIT_ADDRESS
          : order.exchangeAddress;

      for (const offerItem of order.seaportOrder.parameters.offer) {
        acc.push({
          ...offerItem,
          orderHash: order.hash,
          owner,
          operator,
        });
      }

      return acc;
    },
    [] as (LootexOfferItem & {
      orderHash: `0x${string}`;
      owner: `0x${string}`;
      operator: `0x${string}`;
    })[],
  );

  const nativeItems = allOfferItems.filter((item) => item.itemType === 0);
  const erc20Items = allOfferItems.filter((item) => item.itemType === 1);
  const erc721Items = allOfferItems.filter((item) => item.itemType === 2);
  const erc1155Items = allOfferItems.filter((item) => item.itemType === 3);

  const nativeBalanceCalls = nativeItems.map((item) => {
    return {
      item,
      checkType: 'balance',
      call: () =>
        publicClient.getBalance({
          address: item.owner,
        }),
    };
  });

  const erc20BalanceCalls = erc20Items.map((item) => {
    return {
      item,
      checkType: 'balance',
      call: () =>
        publicClient.readContract({
          abi: erc20Abi,
          address: item.token as `0x${string}`,
          functionName: 'balanceOf',
          args: [item.owner],
        }),
    };
  });

  const erc20AllowanceCalls = erc20Items.map((item) => {
    return {
      item,
      checkType: 'allowance',
      call: () =>
        publicClient.readContract({
          abi: erc20Abi,
          address: item.token as `0x${string}`,
          functionName: 'allowance',
          args: [item.owner, item.operator],
        }),
    };
  });

  const erc721OwnerCalls = erc721Items.map((item) => {
    return {
      item,
      checkType: 'owner',
      call: () =>
        publicClient.readContract({
          abi: erc721Abi,
          address: item.token as `0x${string}`,
          functionName: 'ownerOf',
          args: [BigInt(item.identifierOrCriteria)],
        }),
    };
  });

  const erc721ApprovalCalls = erc721Items.map((item) => {
    return {
      item,
      checkType: 'approval',
      call: () =>
        publicClient.readContract({
          abi: erc721Abi,
          address: item.token as `0x${string}`,
          functionName: 'isApprovedForAll',
          args: [item.owner, item.operator],
        }),
    };
  });

  const erc1155BalanceCalls = erc1155Items.map((item) => {
    return {
      item,
      checkType: 'balance',
      call: () =>
        publicClient.readContract({
          abi: erc1155Abi,
          address: item.token as `0x${string}`,
          functionName: 'balanceOf',
          args: [item.owner, BigInt(item.identifierOrCriteria)],
        }),
    };
  });

  const erc1155ApprovalCalls = erc1155Items.map((item) => {
    return {
      item,
      checkType: 'approval',
      call: () =>
        publicClient.readContract({
          abi: erc1155Abi,
          address: item.token as `0x${string}`,
          functionName: 'isApprovedForAll',
          args: [item.owner, item.operator],
        }),
    };
  });

  const calls = [
    ...nativeBalanceCalls,
    ...erc20BalanceCalls,
    ...erc20AllowanceCalls,
    ...erc721OwnerCalls,
    ...erc721ApprovalCalls,
    ...erc1155BalanceCalls,
    ...erc1155ApprovalCalls,
  ];

  const callsWithResults = (
    await Promise.all(calls.map((call) => call.call()))
  ).map((result, index) => {
    const call = calls[index];

    let isValid = false;

    if (call.checkType === 'balance') {
      isValid =
        (result as bigint) >=
        BigInt(call.item.availableAmount ?? call.item.startAmount);
    }

    if (call.checkType === 'allowance') {
      isValid =
        (result as bigint) >=
        BigInt(call.item.availableAmount ?? call.item.startAmount);
    }

    if (call.checkType === 'owner') {
      isValid =
        (result as `0x${string}`).toLowerCase() ===
        call.item.owner.toLowerCase();
    }

    if (call.checkType === 'approval') {
      isValid = result as boolean;
    }

    return {
      item: call.item,
      isValid,
    };
  });

  return orders.map((order) => {
    // every offer item associated with the order must be valid
    const isValid = callsWithResults
      .filter((call) => call.item.orderHash === order.hash)
      .every((call) => call.isValid);

    return isValid;
  });
};
