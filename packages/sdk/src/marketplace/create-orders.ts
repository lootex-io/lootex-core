import { AbiCoder, concat } from 'ethers-v6';
import { getAddress, zeroHash } from 'viem';
import { seaportAddresses } from '../aggregator/constants.js';
import { getBulkOrderTree } from '../aggregator/helpers/eip712/bulk-orders.js';
import type { OfferItemOnCreate } from '../aggregator/types.js';
import type { ConsiderationItemOnCreate } from '../aggregator/types.js';
import type { Client } from '../client/index.js';
import { SEAPORT_1_6_ABI } from '../seaport/abi.js';
import { checkBalancesAndApprovals } from '../seaport/check-balances-and-approvals.js';
import { EIP_712_ORDER_TYPE } from '../seaport/constants.js';
import { formatOrder } from '../seaport/format-order.js';
import { getOrderHash } from '../seaport/get-order-hash.js';
import { ItemType, type OrderComponents } from '../seaport/types.js';
import type { TransactionData } from '../utils/transaction.js';

/**
 * Sorts consideration items based on their properties
 * @param {ConsiderationItemOnCreate[]} considerations - Array of consideration items to sort
 * @returns {ConsiderationItemOnCreate[]} Sorted array of consideration items
 */
export function sortConsiderations(
  considerations: ConsiderationItemOnCreate[],
): ConsiderationItemOnCreate[] {
  return considerations.sort((a, b) => {
    if (a.itemType !== b.itemType) {
      return Number(b.itemType) - Number(a.itemType);
    }
    if (a.amount !== b.amount) {
      return BigInt(b.amount ?? 0) - BigInt(a.amount ?? 0) > 0n ? 1 : -1;
    }
    if (a.startAmount !== b.startAmount) {
      return BigInt(b.startAmount ?? 0) - BigInt(a.startAmount ?? 0) > 0n
        ? 1
        : -1;
    }
    if (a.recipient > b.recipient) {
      return 1;
    }
    return -1;
  });
}

/**
 * Formats fee considerations for an order
 * @param {Object} params - Parameters for formatting fees
 * @param {Array<{bps: number, recipient: string}>} [params.fees] - Array of fee specifications
 * @param {string} params.currency - Currency token address
 * @param {bigint} params.totalPrice - Total price of the order
 * @returns {ConsiderationItemOnCreate[]} Array of formatted fee consideration items
 */
export const formatFeeConsiderations = ({
  fees,
  currency,
  totalPrice,
}: {
  fees?: { bps: number; recipient: `0x${string}` }[];
  currency: `0x${string}`;
  totalPrice: bigint;
}) => {
  return (
    fees?.map((fee) => {
      const amount = (totalPrice * BigInt(fee.bps)) / 10000n;

      return {
        itemType:
          currency === '0x0000000000000000000000000000000000000000'
            ? ItemType.NATIVE
            : ItemType.ERC20,
        token: currency,
        identifier: '0',
        amount: amount.toString(),
        recipient: fee.recipient,
      };
    }) ?? []
  );
};

/**
 * Step for approving tokens
 * @interface ApproveStep
 */
export type ApproveStep = {
  /** Identifier for the token approval step */
  id: 'approve-tokens';
  /** Array of transaction items for approvals */
  items: {
    /** Type of the item - always 'transaction' for approvals */
    type: 'transaction';
    /** Transaction data to be sent to the blockchain */
    data: TransactionData;
    /** Token address being approved */
    token: `0x${string}`;
    /** Token identifier or criteria for the approval */
    identifierOrCriteria: string;
  }[];
};

/**
 * Step for creating an order
 * @interface CreateOrderStep
 */
export type CreateOrderStep = {
  /** Step identifier */
  id: string;
  /** Whether the step needs proof and signature encoding */
  needEncodeProofAndSignature: boolean;
  /** Array of items to process in this step */
  items: (
    | {
        /** Type of the item - 'signTypedData' for signing operations */
        type: 'signTypedData';
        /** EIP-712 typed data to be signed */
        data: {
          domain: {
            name: string;
            version: string;
            chainId: number;
            verifyingContract: `0x${string}`;
          };
          types: Record<string, unknown>;
          message: Record<string, unknown>;
          primaryType: string;
        };
      }
    | {
        /** Type of the item - 'post' for API calls */
        type: 'post';
        /** API endpoint to call */
        endpoint: string;
        /** Request body data */
        body: unknown;
      }
  )[];
};

/**
 * Data structure for creating orders
 * @interface CreateOrderData
 */
export type CreateOrderData = {
  /** Address of the token being traded */
  tokenAddress: `0x${string}`;
  /** Type of the token (ERC721 or ERC1155) */
  tokenType?: 'ERC721' | 'ERC1155';
  /** ID of the token */
  tokenId?: string;
  /** Price per unit */
  unitPrice: string;
  /** Quantity of tokens */
  quantity?: string;
  /** Currency token address */
  currency?: `0x${string}`;
  /** Order start time */
  startTime?: number;
  /** Order end time */
  endTime?: number;
  /** Order duration */
  duration?: number;
  /** Array of fee specifications */
  fees?: {
    /** Fee recipient address */
    recipient: `0x${string}`;
    /** Fee amount in basis points */
    bps: number;
  }[];
}[];

/**
 * Creates orders on the Lootex marketplace
 *
 * @param {Object} params - Parameters for creating orders
 * @param {Client} params.client - The Lootex client instance
 * @param {number} params.chainId - The blockchain network chain ID
 * @param {'LISTING' | 'OFFER'} params.category - Type of order to create
 * @param {string} params.accountAddress - The Ethereum address creating the orders
 * @param {CreateOrderData} params.data - Array of order data
 * @param {boolean} [params.enableBulkOrder] - Whether to enable bulk order creation
 * @returns {Promise<{steps: (ApproveStep | CreateOrderStep)[]}>} A promise that resolves with the creation steps
 * @throws Will throw an error if the creation fails or if the chain is not supported
 */
export const createOrders = async (params: {
  client: Client;
  chainId: number;
  category: 'LISTING' | 'OFFER';
  accountAddress: `0x${string}`;
  data: CreateOrderData;
  enableBulkOrder?: boolean;
}) => {
  const { client, chainId, category, accountAddress, data, enableBulkOrder } =
    params;

  const seaportAddress = seaportAddresses[chainId];

  if (!seaportAddress) {
    throw new Error(
      `Chain ${chainId} is not supported: missing seaport address`,
    );
  }

  if (!data?.length) {
    throw new Error('No orders');
  }

  const offererCounter = await client
    .getPublicClient({ chainId })
    .readContract({
      address: seaportAddress,
      abi: SEAPORT_1_6_ABI,
      functionName: 'getCounter',
      args: [accountAddress],
    });

  const allOrderComponents: OrderComponents[] = data.map((orderData) => {
    const offerItems: OfferItemOnCreate[] = [];
    const considerationItems: ConsiderationItemOnCreate[] = [];

    const currency =
      orderData.currency ?? '0x0000000000000000000000000000000000000000';

    const currencyItemType =
      currency === '0x0000000000000000000000000000000000000000'
        ? ItemType.NATIVE
        : ItemType.ERC20;

    const totalPriceAmount =
      BigInt(orderData.unitPrice) * BigInt(orderData.quantity ?? 1);

    const feeConsiderationItems = formatFeeConsiderations({
      fees: orderData.fees,
      currency,
      totalPrice: totalPriceAmount,
    });

    const totalFeeAmount = feeConsiderationItems.reduce(
      (acc, item) => acc + BigInt(item.amount),
      0n,
    );

    const totalEarningAmount = totalPriceAmount - totalFeeAmount;

    if (category === 'LISTING') {
      if (!orderData.tokenId) {
        throw new Error('Token ID is required for listing');
      }

      offerItems.push({
        itemType: ItemType[orderData.tokenType ?? 'ERC721'],
        token: orderData.tokenAddress,
        identifier: orderData.tokenId.toString(),
        amount: orderData.quantity?.toString() ?? '1',
      });

      considerationItems.push(
        {
          itemType: currencyItemType,
          amount: totalEarningAmount.toString(),
          identifier: '0',
          token: currency,
          recipient: accountAddress,
        },
        ...feeConsiderationItems,
      );
    } else {
      const isCollectionOffer = orderData.tokenId === undefined;

      offerItems.push({
        itemType: currencyItemType,
        amount: totalPriceAmount.toString(),
        identifier: '0',
        token: currency,
      });

      considerationItems.push(
        {
          itemType: isCollectionOffer
            ? ItemType[orderData.tokenType ?? 'ERC721'] + 2
            : ItemType[orderData.tokenType ?? 'ERC721'],
          token: getAddress(orderData.tokenAddress),
          identifier: isCollectionOffer
            ? '0'
            : (orderData.tokenId?.toString() ?? '0'),
          amount: orderData.quantity?.toString() ?? '1',
          recipient: accountAddress,
        },
        ...feeConsiderationItems,
      );
    }

    return formatOrder({
      offer: offerItems,
      consideration: sortConsiderations(considerationItems),
      startTime: orderData.startTime?.toString(),
      endTime: orderData.endTime?.toString(),
      offerer: accountAddress,
      counter: offererCounter.toString(),
      allowPartialFills: true,
    });
  });

  const {
    balancesOfUniqueTokens,
    approvalsOfUniqueContracts,
    approvalActions,
  } = await checkBalancesAndApprovals({
    client,
    accountAddress,
    operator: seaportAddress,
    allOrderComponents,
    chainId,
  });

  const domain = {
    name: 'Seaport',
    version: '1.6',
    chainId: chainId,
    verifyingContract: seaportAddress,
  };
  const tree = getBulkOrderTree(allOrderComponents);

  const bulkOrderType = tree.types;
  const chunks = tree.getDataToSign();
  const value = { tree: chunks };

  const approveStep: ApproveStep = {
    id: 'approve-tokens',
    items: await Promise.all(
      approvalActions.map(async (action) => ({
        type: 'transaction',
        data: await action.buildTransaction(),
        token: action.token,
        identifierOrCriteria: action.identifierOrCriteria,
      })),
    ),
  };

  const shouldUseBulkOrder = !!(
    enableBulkOrder && allOrderComponents.length > 1
  );

  const createOrderStep: CreateOrderStep = {
    id: 'create-orders',
    needEncodeProofAndSignature: shouldUseBulkOrder,
    items: shouldUseBulkOrder
      ? ([
          {
            type: 'signTypedData' as const,
            data: {
              domain,
              types: bulkOrderType,
              message: value,
              primaryType: 'BulkOrder',
            },
          },
          {
            type: 'post' as const,
            endpoint: '/v3/orders/bulk',
            body: allOrderComponents.map((orderComponents, i) => ({
              ...orderComponents,
              category: 'listing',
              exchangeAddress: seaportAddress,
              chainId: chainId.toString(),
              hash: getOrderHash(orderComponents),
              proof: tree.getProof(i).proof,
              signature: zeroHash,
            })),
          },
        ] as const)
      : [
          ...allOrderComponents.map((orderComponents) => ({
            type: 'signTypedData' as const,
            data: {
              domain,
              types: EIP_712_ORDER_TYPE,
              message: orderComponents,
              primaryType: 'OrderComponents',
            },
          })),
          {
            type: 'post' as const,
            endpoint: '/v3/orders/bulk',
            body: allOrderComponents.map((orderComponents) => ({
              ...orderComponents,
              category:
                allOrderComponents.length > 1
                  ? 'listing'
                  : (category === 'LISTING' && 'listing') || 'OFFER',
              exchangeAddress: seaportAddress,
              chainId: chainId.toString(),
              hash: getOrderHash(orderComponents),
              signature: zeroHash,
            })),
          },
        ],
  };

  return {
    steps: [approveStep, createOrderStep],
  };
};

export const encodeBulkOrderSignature = (
  key: number,
  proof: string[],
  signature = `0x${'ff'.repeat(64)}`,
) => {
  return concat([
    signature,
    `0x${key.toString(16).padStart(6, '0')}`,
    AbiCoder.defaultAbiCoder().encode([`uint256[${proof.length}]`], [proof]),
  ]);
};
