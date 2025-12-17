import { encodeFunctionData, maxInt256 } from 'viem';
import { erc20Abi } from '../abi/erc20.js';
import { erc721Abi } from '../abi/erc721.js';
import { aggregatorAbi } from '../aggregator/abi.js';
import { aggregatorAddresses } from '../aggregator/constants.js';
import { buildFulfillTransaction } from '../aggregator/helpers/aggregator/build-transaction.js';
import { getOrdersWithSignature } from '../aggregator/helpers/get-orders-signature.js';
import type { Client } from '../client/index.js';
import type { LootexConsiderationItem, LootexOrder } from '../order/types.js';
import { ItemType } from '../seaport/types.js';
import { Fraction } from '../utils/fraction.js';
import type { TransactionData } from '../utils/transaction.js';
import type { ApproveStep } from './create-orders.js';

/**
 * Parameters for fulfilling orders on the Lootex marketplace
 * @interface FulfillOrdersParams
 */
export type FulfillOrdersParams = {
  /** The Lootex client instance */
  client: Client;
  /** The blockchain network chain ID */
  chainId: number;
  /** Array of orders to be fulfilled */
  orders: LootexOrder[];
  /** Optional operator address for the fulfillment */
  operator?: `0x${string}`;
  /** Maximum number of orders to process in a single transaction */
  maxOrdersPerTx?: number;
  /** Whether this is fulfilling an offer (true) or a listing (false) */
  isFullfillOffer?: boolean;
  /** The Ethereum address of the account fulfilling the orders */
  accountAddress: `0x${string}`;
};

/**
 * Step for approving the aggregator contract
 * @interface ApproveAggregatorStep
 */
export type ApproveAggregatorStep = {
  /** Identifier for the aggregator approval step */
  id: 'approve-aggregator';
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
 * Step for executing the exchange transaction
 * @interface ExchangeStep
 */
export type ExchangeStep = {
  /** Identifier for the exchange step */
  id: 'exchange';
  /** Array of transaction items to execute */
  items: {
    /** Type of the item - always 'transaction' for exchange */
    type: 'transaction';
    /** Transaction data including destination, calldata and optional value */
    data: {
      /** Destination address for the transaction */
      to: `0x${string}`;
      /** Encoded function call data */
      data: `0x${string}`;
      /** Optional amount of native currency to send */
      value?: string;
    };
  }[];
};

/**
 * Fulfills multiple orders on the Lootex marketplace
 *
 * @param {FulfillOrdersParams} params - The parameters for fulfilling orders
 * @returns {Promise<{steps: (ApproveStep | ApproveAggregatorStep | ExchangeStep)[]}>} A promise that resolves with the fulfillment steps
 * @throws Will throw an error if the fulfillment fails or if the chain is not supported
 */
export const fulfillOrders = async (params: FulfillOrdersParams) => {
  const {
    client,
    chainId,
    orders: ordersWithPartialSignature,
    operator,
    maxOrdersPerTx,
    isFullfillOffer,
    accountAddress,
  } = params;

  const aggregatorAddress = aggregatorAddresses[chainId];
  if (!aggregatorAddress) {
    throw new Error(
      `Chain ${chainId} is not supported: missing aggregator address`,
    );
  }

  // Patch missing signatures
  const { ordersWithSignature: orders } = await getOrdersWithSignature({
    orders: ordersWithPartialSignature,
    client,
  });

  const _operator = operator ?? aggregatorAddress;

  // Aggregate consideration items
  const aggregatedConsiderationItems = orders
    .flatMap((order) => order.seaportOrder.parameters.consideration)
    .reduce<LootexConsiderationItem[]>((accumulator, currentValue) => {
      const checkIsSameConsiderationItem = (item: LootexConsiderationItem) => {
        return (
          item.token === currentValue.token &&
          item.itemType === currentValue.itemType &&
          item.identifierOrCriteria === currentValue.identifierOrCriteria
        );
      };
      const sameConsiderationItem = accumulator.find((item) =>
        checkIsSameConsiderationItem(item),
      );

      if (sameConsiderationItem) {
        const shallowCopy = { ...sameConsiderationItem };
        shallowCopy.startAmount = Fraction.fromDecimal(shallowCopy.startAmount)
          .add(Fraction.fromDecimal(currentValue.startAmount))
          .quotient()
          .toString();
        shallowCopy.endAmount = Fraction.fromDecimal(shallowCopy.endAmount)
          .add(Fraction.fromDecimal(currentValue.endAmount))
          .quotient()
          .toString();
        if (shallowCopy.availableAmount && currentValue.availableAmount) {
          shallowCopy.availableAmount = Fraction.fromDecimal(
            shallowCopy.availableAmount,
          )
            .add(Fraction.fromDecimal(currentValue.availableAmount))
            .quotient()
            .toString();
        }
        return [
          ...accumulator.filter((item) => !checkIsSameConsiderationItem(item)),
          shallowCopy,
        ];
      }
      return accumulator.concat([currentValue]);
    }, []);

  // Filter consideration items paid by fulfiller
  const considerationItemsPaidByFulfiller = aggregatedConsiderationItems.filter(
    (item) => !isFullfillOffer || item.itemType !== ItemType.ERC20,
  );

  // Check approvals of aggregated consideration items
  const needApprovals = await Promise.all(
    considerationItemsPaidByFulfiller.map(async (item) => {
      if (item.itemType === ItemType.NATIVE) {
        return false;
      }

      if (item.itemType === ItemType.ERC20) {
        const allowance = await client
          .getPublicClient({ chainId })
          .readContract({
            address: item.token as `0x${string}`,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [accountAddress, _operator],
          });

        return allowance < BigInt(item.startAmount);
      }

      const isApprovedForAll = await client
        .getPublicClient({ chainId })
        .readContract({
          address: item.token as `0x${string}`,
          abi: erc721Abi,
          functionName: 'isApprovedForAll',
          args: [accountAddress, _operator],
        });

      return !isApprovedForAll;
    }),
  );

  // Build approval action;

  const approveStep: ApproveStep = {
    id: 'approve-tokens',
    items: considerationItemsPaidByFulfiller.reduce(
      (items, item, index) => {
        if (needApprovals[index]) {
          const action = {
            type: 'transaction',
            token: item.token as `0x${string}`,
            identifierOrCriteria: item.identifierOrCriteria,
            data: {
              to: item.token as `0x${string}`,
              data:
                item.itemType === ItemType.ERC20
                  ? encodeFunctionData({
                      abi: erc20Abi,
                      functionName: 'approve',
                      args: [_operator, maxInt256],
                    })
                  : encodeFunctionData({
                      abi: erc721Abi,
                      functionName: 'setApprovalForAll',
                      args: [_operator, true],
                    }),
            },
          } as const;

          return items.concat([action]);
        }

        return items;
      },
      [] as {
        type: 'transaction';
        data: TransactionData;
        token: `0x${string}`;
        identifierOrCriteria: string;
      }[],
    ),
  };

  const approveAggregatorStep: ApproveAggregatorStep = {
    id: 'approve-aggregator',
    items: [],
  };

  // Check approvals between aggregator and operator
  if (
    orders.length > 0 &&
    orders[0]?.seaportOrder?.parameters?.consideration?.[0]?.itemType > 1 // non currency
  ) {
    const item = orders[0].seaportOrder.parameters.consideration[0];
    const type =
      item.itemType === ItemType.ERC721 ||
      item.itemType === ItemType.ERC721_WITH_CRITERIA
        ? 'ERC721'
        : 'ERC1155';
    const isApproved = await client.getPublicClient({ chainId }).readContract({
      address: item.token as `0x${string}`,
      abi: erc721Abi,
      functionName: 'isApprovedForAll',
      args: [_operator, orders[0].exchangeAddress],
    });

    if (!isApproved) {
      const action = {
        type: 'transaction',
        token: item.token as `0x${string}`,
        identifierOrCriteria: item.identifierOrCriteria,
        data: {
          to: aggregatorAddress,
          data: encodeFunctionData({
            abi: aggregatorAbi,
            functionName:
              type === 'ERC721' ? 'approveERC721' : 'approveERC1155',
            args: [item.token, orders[0].exchangeAddress, true],
          }),
        },
      } as const;

      approveAggregatorStep.items = [...approveAggregatorStep.items, action];
    }
  }

  // Split orders into orderMaxPerTx orders per transaction
  const seperatedOrders = orders.reduce<LootexOrder[][]>(
    (acc, order, index) => {
      const perTx = maxOrdersPerTx ?? orders.length;
      const i = Math.floor(index / perTx);
      if (!acc[i]) {
        acc[i] = [];
      }
      acc[i].push(order);
      return acc;
    },
    [],
  );

  const exchangeStep: ExchangeStep = {
    id: 'exchange',
    items: seperatedOrders.map((orders) => {
      const transaction = buildFulfillTransaction({
        orders,
        accountAddress,
      });

      return {
        type: 'transaction',
        data: {
          ...transaction,
          value: transaction.value?.toString(),
        },
      };
    }),
  };

  // Build exchange actions

  return {
    steps: [
      approveStep,
      ...(approveAggregatorStep.items.length > 0
        ? [approveAggregatorStep]
        : []),
      exchangeStep,
    ],
  };
};
