import { encodeFunctionData, erc20Abi, erc721Abi, maxInt256 } from 'viem';
import type { LootexConsiderationItem, LootexOrder } from '../order/types';
import {
  EIP_712_ORDER_TYPE,
  OPENSEA_CONDUIT_ADDRESS,
} from '../seaport/constants';
import { ItemType, type OrderComponents } from '../seaport/types';
import { Fraction } from '../utils/fraction';

import { createApiClient } from '../api/api-client';
import type { Client } from '../client/index';
import { SEAPORT_1_6_ABI } from '../seaport/abi';
import { checkBalancesAndApprovals } from '../seaport/check-balances-and-approvals';
import { formatOrder } from '../seaport/format-order';
import { getOrderHash } from '../seaport/get-order-hash';
import { aggregatorAbi } from './abi';
import { aggregatorAddresses, seaportAddresses } from './constants';
import { buildFulfillTransaction } from './helpers/aggregator/build-transaction';
import { batchValidateOrders } from './helpers/batch-validate-orders';
import {
  checkApprovals,
  checkBalances,
  checkIsOrderFulfillable,
  simulateValidateOrder,
} from './helpers/check-is-order-fulfillable';
import { getBulkOrderTree } from './helpers/eip712/bulk-orders';
import { getOrdersWithSignature } from './helpers/get-orders-signature';
import { formatOrderParams } from './helpers/seaport/format-order-params';
import {
  addTipsToOrder,
  tipConfigToConsiderationItem,
} from './helpers/seaport/tips';
import type {
  ApprovalAction,
  CancelOrdersParams,
  CreateOrderAction,
  CreateOrdersExecution,
  CreateOrdersParams,
  ExchangeAction,
  FulfillOrdersExecution,
  FulfillOrdersParams,
  QueryOrdersParams,
  ValidateOrdersParams,
} from './types';
import { groupBy, map } from './utils';

export type CreateAggregatorParams = {
  client: Client;
};

export const createAggregator = (config: CreateAggregatorParams) => {
  const { client } = config;

  return new Aggregator({
    client,
  });
};

export class Aggregator {
  private client: Client;

  constructor(config: { client: Client }) {
    const { client } = config;

    this.client = client;
  }

  public async queryOrders(params: QueryOrdersParams) {
    const apiClient = createApiClient({ client: this.client });
    return apiClient.orders.getOrders(params);
  }

  public async createOrders({
    chainId,
    walletClient,
    orders,
    accountAddress,
  }: CreateOrdersParams): Promise<CreateOrdersExecution> {
    // 1. init seaport instance

    const seaportAddress = seaportAddresses[chainId];

    if (!seaportAddress) {
      throw new Error(
        `Chain ${chainId} is not supported: missing seaport address`,
      );
    }

    if (!orders?.length) {
      throw new Error('No orders');
    }

    const isListing = orders.every((order) => order.orderType === 'LISTING');

    const offererCounter = await this.client
      .getPublicClient({ chainId })
      .readContract({
        address: seaportAddress,
        abi: SEAPORT_1_6_ABI,
        functionName: 'getCounter',
        args: [accountAddress],
      });

    // 2. prepare order params
    const createOrderInput = orders.map((order) => {
      return formatOrderParams({
        ...order,
        accountAddress,
      });
    });

    const allOrderComponents = createOrderInput.map((input) =>
      formatOrder({
        offerer: accountAddress,
        counter: input.counter ?? offererCounter,
        ...input,
      }),
    );

    const {
      balancesOfUniqueTokens,
      approvalsOfUniqueContracts,
      approvalActions,
    } = await checkBalancesAndApprovals({
      client: this.client,
      accountAddress,
      operator: seaportAddress,
      allOrderComponents,
      chainId,
    });

    const createOrdersAction: CreateOrderAction = {
      type: 'create',
      createOrders: async ({
        enableBulkOrder = true,
        createOrdersOnOrderbook = true,
        encodeSignature,
      } = {}) => {
        const domain = {
          name: 'Seaport',
          version: '1.6',
          chainId: chainId,
          verifyingContract: seaportAddress,
        };

        let signedOrders: {
          parameters: OrderComponents;
          signature: `0x${string}`;
          orderHash: `0x${string}`;
        }[] = [];

        if (allOrderComponents.length === 1 || !enableBulkOrder) {
          signedOrders = await Promise.all(
            allOrderComponents.map(async (orderComponents) => {
              const signature = await walletClient.signTypedData({
                domain,
                types: EIP_712_ORDER_TYPE,
                message: orderComponents,
                primaryType: 'OrderComponents',
              });

              return {
                parameters: orderComponents,
                signature,
                orderHash: getOrderHash(orderComponents),
              };
            }),
          );
        } else {
          const tree = getBulkOrderTree(allOrderComponents);
          const bulkOrderType = tree.types;
          const chunks = tree.getDataToSign();
          const value = { tree: chunks };

          const signature = await walletClient.signTypedData({
            domain,
            types: bulkOrderType,
            message: value,
            primaryType: 'BulkOrder',
          });

          signedOrders = allOrderComponents.map((parameters, i) => ({
            parameters,
            signature: tree.getEncodedProofAndSignature(
              i,
              signature,
            ) as `0x${string}`,
            orderHash: getOrderHash(parameters),
          }));
        }

        if (createOrdersOnOrderbook) {
          const params = signedOrders.map((order) => {
            return {
              ...order.parameters,
              signature: encodeSignature
                ? encodeSignature(order.signature)
                : order.signature,
              hash: order.orderHash,
              // exchange address has to be lowercased for some reason
              exchangeAddress: seaportAddress.toLowerCase() as `0x${string}`,
              category:
                // also very strange api requirement
                signedOrders.length > 1
                  ? 'listing'
                  : (isListing && 'LISTING') || 'OFFER',
              chainId: chainId.toString(),
              counter: order.parameters.counter.toString(),
            };
          });
          const apiClient = createApiClient({ client: this.client });
          let lootexOrders: LootexOrder[] = [];
          if (signedOrders.length > 1) {
            lootexOrders = await apiClient.orders.createBulkOrders(params);
          } else {
            lootexOrders = [await apiClient.orders.createOrder(params[0])];
          }
          return { seaportOrders: signedOrders, lootexOrders };
        }

        return { seaportOrders: signedOrders, lootexOrders: [] };
      },
    };

    return {
      actions: [...approvalActions, createOrdersAction],
    };
  }

  public async fulfillOrders({
    chainId,
    orders: ordersWithPartialSignature,
    accountAddress,
    operator,
    maxOrdersPerTx,
    tips,
    isFullfillOffer = false,
  }: FulfillOrdersParams): Promise<FulfillOrdersExecution> {
    const aggregatorAddress = aggregatorAddresses[chainId];
    if (!aggregatorAddress) {
      throw new Error(
        `Chain ${chainId} is not supported: missing aggregator address`,
      );
    }

    // Patch missing signatures
    const { ordersWithSignature } = await getOrdersWithSignature({
      orders: ordersWithPartialSignature,
      client: this.client,
    });

    // Add tips to orders
    const orders = ordersWithSignature.map((order) => {
      if (tips?.length) {
        const tipItems = tips.map((tip) =>
          tipConfigToConsiderationItem(tip, order),
        );

        return addTipsToOrder(order, tipItems);
      }

      return order;
    });

    const _operator = operator ?? aggregatorAddress;

    // Aggregate consideration items
    const aggregatedConsiderationItems = orders
      .flatMap((order) => order.seaportOrder.parameters.consideration)
      .reduce<LootexConsiderationItem[]>((accumulator, currentValue) => {
        const checkIsSameConsiderationItem = (
          item: LootexConsiderationItem,
        ) => {
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
          shallowCopy.startAmount = Fraction.fromDecimal(
            shallowCopy.startAmount,
          )
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
            ...accumulator.filter(
              (item) => !checkIsSameConsiderationItem(item),
            ),
            shallowCopy,
          ];
        }
        return accumulator.concat([currentValue]);
      }, []);

    // Filter consideration items paid by fulfiller
    const considerationItemsPaidByFulfiller =
      aggregatedConsiderationItems.filter(
        (item) => !isFullfillOffer || item.itemType !== ItemType.ERC20,
      );

    // Check approvals of aggregated consideration items
    const needApprovals = await Promise.all(
      considerationItemsPaidByFulfiller.map(async (item) => {
        if (item.itemType === ItemType.NATIVE) {
          return false;
        }

        if (item.itemType === ItemType.ERC20) {
          const allowance = await this.client
            .getPublicClient({ chainId })
            .readContract({
              address: item.token as `0x${string}`,
              abi: erc20Abi,
              functionName: 'allowance',
              args: [accountAddress, _operator],
            });

          return allowance < BigInt(item.startAmount);
        }

        const isApprovedForAll = await this.client
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

    // Build approval actions
    const approveActions = considerationItemsPaidByFulfiller.reduce<
      ApprovalAction[]
    >((actions, item, index) => {
      if (needApprovals[index]) {
        const action: ApprovalAction = {
          type: 'approve',
          token: item.token as `0x${string}`,
          identifierOrCriteria: item.identifierOrCriteria,
          itemType: item.itemType,
          operator: _operator,
          buildTransaction: async () => ({
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
          }),
        };

        return actions.concat([action]);
      }

      return actions;
    }, []);

    // Check approvals between aggregator and operator
    const aggregatorApproveActions: ApprovalAction[] = [];
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
      const isApproved = await this.client
        .getPublicClient({ chainId })
        .readContract({
          address: item.token as `0x${string}`,
          abi: erc721Abi,
          functionName: 'isApprovedForAll',
          args: [_operator, orders[0].exchangeAddress],
        });
      if (!isApproved) {
        const action: ApprovalAction = {
          type: 'approve',
          token: item.token as `0x${string}`,
          identifierOrCriteria: item.identifierOrCriteria,
          itemType: item.itemType,
          operator: _operator,
          buildTransaction: async () => ({
            to: aggregatorAddress,
            data: encodeFunctionData({
              abi: aggregatorAbi,
              functionName:
                type === 'ERC721' ? 'approveERC721' : 'approveERC1155',
              args: [item.token, orders[0].exchangeAddress, true],
            }),
          }),
        };
        aggregatorApproveActions.push(action);
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

    // Build exchange actions
    const exchangeActions: ExchangeAction[] = seperatedOrders.map((orders) => {
      return {
        type: 'exchange',
        orders,
        buildTransaction: async () =>
          buildFulfillTransaction({
            orders,
            accountAddress,
          }),
      };
    });

    return {
      actions: [
        ...approveActions,
        ...aggregatorApproveActions,
        ...exchangeActions,
      ],
      syncTxHashes: (hashes: `0x${string}`[]) =>
        this.syncTxHashes({ chainId, hashes }),
    };
  }

  public async cancelOrders({ orders, chainId }: CancelOrdersParams) {
    const cancellableOrders = (
      await Promise.all(
        orders.map(async (order) => {
          const [, isCancelled] = await this.client
            .getPublicClient({ chainId })
            .readContract({
              address: order.exchangeAddress,
              abi: SEAPORT_1_6_ABI,
              functionName: 'getOrderStatus',
              args: [order.hash],
            });

          return {
            isCancelled,
            order,
          };
        }),
      )
    )
      ?.filter(({ isCancelled }) => !isCancelled)
      .map(({ order }) => order);

    const ordersByExchangeAddress = groupBy(
      cancellableOrders,
      ({ exchangeAddress }) => exchangeAddress,
    );

    const cancelActions = map(
      ordersByExchangeAddress,
      (orders, _exchanageAddress) => {
        return {
          type: 'cancel',
          buildTransaction: async () => {
            const to = _exchanageAddress as `0x${string}`;
            const data = encodeFunctionData({
              abi: SEAPORT_1_6_ABI,
              functionName: 'cancel',
              args: [
                //@ts-ignore
                orders.map((order) => order.seaportOrder.parameters),
              ],
            });

            return { to, data };
          },
          ordersToCancel: orders,
        };
      },
    );

    return {
      actions: cancelActions,
      syncTxHashes: (hashes: `0x${string}`[]) =>
        this.syncTxHashes({ chainId, hashes }),
    };
  }

  public async validateOrders({ orders, chainId }: ValidateOrdersParams) {
    return await Promise.all(
      orders.map((order) =>
        checkIsOrderFulfillable({
          order,
          chainId,
          client: this.client,
        }),
      ),
    );
  }

  public async validateOrdersSignatures({
    orders,
    chainId,
  }: ValidateOrdersParams) {
    const publicClient = this.client.getPublicClient({ chainId });

    try {
      await publicClient.call({
        to: seaportAddresses[chainId],
        data: encodeFunctionData({
          abi: SEAPORT_1_6_ABI,
          functionName: 'validate',
          //@ts-ignore
          args: [orders.map((order) => order.seaportOrder)],
        }),
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  public async strictValidateOrders({
    orders,
    chainId,
  }: ValidateOrdersParams): Promise<
    {
      isValid: boolean;
      invalidReasons: string[];
    }[]
  > {
    const balanceAndApprovalResults = await batchValidateOrders({
      client: this.client,
      orders,
    });

    const signatureAndStatusResults = await Promise.all(
      orders.map(async (order) => {
        return simulateValidateOrder({
          client: this.client,
          order,
          chainId,
        });
      }),
    );

    const durationResults = orders.map((order) => {
      return order.endTime * 1000 > Date.now();
    });

    return orders.map((order, index) => {
      const isValid =
        balanceAndApprovalResults[index] &&
        signatureAndStatusResults[index] &&
        durationResults[index];

      const invalidReasons: string[] = [];

      if (!balanceAndApprovalResults[index]) {
        invalidReasons.push('Insufficient balances or approvals');
      }

      if (!signatureAndStatusResults[index]) {
        invalidReasons.push('Invalid order signature or status');
      }

      if (!durationResults[index]) {
        invalidReasons.push('Order expired');
      }

      return { isValid, invalidReasons };
    });
  }

  public async syncTxHashes({
    chainId,
    hashes,
  }: {
    chainId: number;
    hashes: `0x${string}`[];
  }) {
    const apiClient = createApiClient({ client: this.client });

    return await Promise.all(
      hashes.map((hash) =>
        apiClient.misc.syncTxHash({
          chainId,
          txHash: hash,
        }),
      ),
    );
  }
}
