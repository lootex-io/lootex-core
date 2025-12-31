import { ethers } from 'ethers-v6';
import { summarizeTokensOfOrders } from '../../../order/summary.js';
import type { LootexOrder } from '../../../order/types.js';
import { OPENSEA_CONDUIT_KEY } from '../../../seaport/constants.js';

import { composeSeaportData } from './compose-seaport-data.js';

export const composeByteData = ({
  orders,
  marketplaceId,
  accountAddress,
  aggregatorAddress,
}: {
  orders: LootexOrder[];
  marketplaceId: number;
  accountAddress: `0x${string}`;
  aggregatorAddress: `0x${string}`;
}) => {
  if (!aggregatorAddress) {
    throw new Error('No Aggregator found');
  }

  const isAcceptOffer = orders[0].category === 'offer';

  const tokens = summarizeTokensOfOrders(orders);
  const nativeToken = tokens.find((token) => token.type === 'NATIVE');

  // get seaport fulfill format
  const seaportData = composeSeaportData({
    orders,
    fulfillerConduitKey:
      marketplaceId === 1
        ? OPENSEA_CONDUIT_KEY
        : '0x0000000000000000000000000000000000000000000000000000000000000000',
    recipient: isAcceptOffer ? aggregatorAddress : accountAddress,
  });

  const marketplaceIdByte = composeToFixedByte(marketplaceId, 2);
  const continueIfFailedByte = composeToFixedByte(1, 1);
  const ethValueByte = composeToFixedByte(
    nativeToken?.amount?.toString() ?? '0',
    21,
  );
  const itemLengthByte = composeToFixedByte(
    ((seaportData.length - 2) / 2).toString(),
    4,
  );

  const byteData =
    marketplaceIdByte +
    continueIfFailedByte.slice(2) +
    ethValueByte.slice(2) +
    itemLengthByte.slice(2) +
    seaportData.slice(2);

  return byteData;
};

const composeToFixedByte = (data: number | string, fixSize: number) => {
  let output = ethers.toBeHex(data);
  output = ethers.zeroPadValue(output, fixSize);
  return output;
};
