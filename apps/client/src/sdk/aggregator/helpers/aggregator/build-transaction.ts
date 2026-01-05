import { encodeFunctionData } from 'viem';
import { summarizeTokensOfOrders } from '../../../order/summary';
import type { LootexOrder } from '../../../order/types';
import { ItemType } from '../../../seaport/types';
import { aggregatorAbi } from '../../abi';
import { aggregatorAddresses } from '../../constants';
import { groupBy } from '../../utils';
import { composeByteData } from './compose-marketplace-data';
import { getAggregatorMarketPlaceId } from './marketplaces';

export const buildFulfillTransaction = ({
  orders,
  accountAddress,
}: {
  orders: LootexOrder[];
  accountAddress: `0x${string}`;
}) => {
  const chainId = orders[0].chainId;
  const aggregatorAddress = aggregatorAddresses[chainId];

  if (!accountAddress) {
    throw new Error('No address found');
  }

  if (!aggregatorAddress) {
    throw new Error('No aggregator found');
  }

  // group orders by marketplace source
  const ordersByMarketplaceId = groupBy(orders, (order) => {
    return getAggregatorMarketPlaceId(order).toString();
  });

  // sort marketplace ids and get byte data
  const byteData = Object.entries(ordersByMarketplaceId)
    .sort(([marketplaceIdA], [marketplaceIdB]) => {
      return Number(marketplaceIdA) - Number(marketplaceIdB);
    })
    .map(([marketplaceId, orders]) => {
      if (!aggregatorAddress) {
        throw new Error('No aggregator found');
      }
      return composeByteData({
        orders,
        marketplaceId: Number(marketplaceId),
        accountAddress,
        aggregatorAddress,
      });
    })
    .reduce((acc, currentByte) => {
      return acc + (acc.startsWith('0x') ? currentByte?.slice(2) : currentByte);
    }, '');

  const tokens = summarizeTokensOfOrders(orders);
  const erc20Token = tokens.find((token) => token.type === 'ERC20');
  const nativeToken = tokens.find((token) => token.type === 'NATIVE');
  const isFulfillOffer = orders[0]?.category === 'offer';

  const getFuncitonNameAndArgs = () => {
    if (isFulfillOffer) {
      const itemType =
        orders[0].seaportOrder.parameters.consideration[0].itemType;
      const isERC721 =
        itemType === ItemType.ERC721 ||
        itemType === ItemType.ERC721_WITH_CRITERIA;

      const payTokenAddress = erc20Token?.address;
      const isCollectionOffer = orders[0].offerType === 'Collection';

      return {
        functionName: isERC721 ? 'acceptWithERC721' : 'acceptWithERC1155',
        args: [
          orders.map((order) => {
            const consideration =
              order.seaportOrder.parameters.consideration[0];
            return {
              nft: consideration.token,
              id: isCollectionOffer
                ? order.considerationCriteria?.[0]?.identifier
                : consideration.identifierOrCriteria,
              ...(isERC721 ? {} : { amount: order.unitsToFill }),
            };
          }),
          [],
          [payTokenAddress],
          byteData,
        ],
      };
    }

    if (erc20Token) {
      return {
        functionName: 'batchBuyWithERC20s',
        args: [
          [
            {
              token: erc20Token.address,
              amount: erc20Token.amount,
            },
          ],
          byteData,
          [erc20Token.address],
        ],
      };
    }
    return { functionName: 'batchBuyWithETH', args: [byteData] };
  };

  const params = getFuncitonNameAndArgs();

  return {
    to: aggregatorAddress,
    data: encodeFunctionData({
      abi: aggregatorAbi,
      functionName: params.functionName,
      args: params.args,
    }),
    value: nativeToken?.amount,
  };
};
