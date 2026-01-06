import { isAddressEqual } from 'viem';
import type { LootexOrder } from '../../../order/types';
import { seaportAddresses } from '../../constants';

export const marketplaceIds = [
  0, // lootex1.4
  1, //opensea
  2, // lootex1.6
];

export const getAggregatorMarketPlaceId = (order: LootexOrder) => {
  const { platformType, chainId, exchangeAddress } = order;

  if (platformType === 0) {
    const seaportContractAddress = seaportAddresses[chainId];

    if (
      seaportContractAddress &&
      isAddressEqual(exchangeAddress as `0x${string}`, seaportContractAddress)
    ) {
      return 2;
    }
  } else if (platformType === 1) {
    return 1;
  }
  return -1;
};
