import { isAddressEqual } from 'viem';

import { SERVICE_FEE_ADDRESS } from './constants';
import type {
  LootexOrder,
  LootexOrderSimple,
  PlatformTypeName,
} from './types';

import {
  CROSS_CHAIN_SEAPORT_V1_6_ADDRESS,
  OPENSEA_CONDUIT_ADDRESS,
} from '../seaport/constants';

import {
  type ConsiderationItem,
  ItemType,
  type OfferItem,
  type SeaportOrder,
} from '../seaport/types';

export const getPlatformType = (typeCode?: number): PlatformTypeName => {
  switch (typeCode) {
    case 0:
      return 'Lootex';
    case 1:
      return 'OpenSea';
    default:
      return 'Unknown';
  }
};

export const isOpenseaOrder = (
  order: Partial<LootexOrder> | Partial<LootexOrderSimple>,
) => {
  if (!order) return false;
  return getPlatformType(order?.platformType) === 'OpenSea';
};

export const checkIsLootexOrder = (
  order: Partial<LootexOrder> | Partial<LootexOrderSimple>,
) => {
  if (!order) return false;
  return getPlatformType(order?.platformType) === 'Lootex';
};
export const getPlatformAddress = ({
  exchangeAddress,
  typeCode,
  isApproveAddress,
}: {
  exchangeAddress?: `0x${string}`;
  typeCode?: number;
  isApproveAddress?: boolean;
}) => {
  if (typeCode === 0) {
    return exchangeAddress;
  }
  if (typeCode === 1) {
    return isApproveAddress
      ? OPENSEA_CONDUIT_ADDRESS
      : CROSS_CHAIN_SEAPORT_V1_6_ADDRESS;
  }
};

export const canBePartialFilled = (order?: LootexOrder) => {
  return order?.orderType === 1 || order?.orderType === 3;
};

export const sumServiceFeeAmountFromSeaportOrders = (
  seaportOrders: SeaportOrder[],
) =>
  seaportOrders.reduce((sum, seaportOrder) => {
    const serviceFee = seaportOrder.parameters.consideration
      .filter(
        (item) =>
          item.recipient.toLowerCase() === SERVICE_FEE_ADDRESS.toLowerCase(),
      )
      .reduce((_sum, item) => _sum + BigInt(item.startAmount), 0n);
    return sum + serviceFee;
  }, 0n);

export const getOrderAvailableQuantity = (order?: LootexOrder) => {
  const {
    seaportOrder: {
      parameters: { consideration = [], offer = [] } = {},
    } = {},
  } = order ?? {};
  const isListing = order?.category === 'listing';
  const quantity = isListing
    ? offer[0]?.availableAmount
    : consideration[0]?.availableAmount;

  return Number(quantity || '0');
};

export const getOrderQuantity = (order?: LootexOrder) => {
  const {
    category,
    seaportOrder: {
      parameters: { offer = [], consideration = [] } = {},
    } = {},
  } = order ?? {};

  const isListing = category === 'listing';

  const quantity = isListing
    ? offer[0]?.startAmount
    : consideration[0]?.startAmount;

  return Number(quantity || '0');
};

export const getMaxAcceptOfferQuantity = (
  order?: LootexOrder,
  availableAmount?: bigint,
) => {
  const unfulfilledQuantity = getOrderAvailableQuantity(order);

  if (!availableAmount || availableAmount < 0n) {
    return 0n;
  }

  if (availableAmount < unfulfilledQuantity) {
    return availableAmount;
  }

  return unfulfilledQuantity;
};

export const isOfferedByAddress = (
  order?: LootexOrder | LootexOrderSimple,
  address?: `0x${string}`,
) => {
  const { offerer } = order ?? {};
  return offerer?.toLowerCase() === address?.toLowerCase();
};

export const isServiceFeeItem = (item: ConsiderationItem) =>
  isAddressEqual(item?.recipient as `0x${string}`, SERVICE_FEE_ADDRESS);

export const isCurrencyItem = (item: ConsiderationItem | OfferItem) =>
  item.itemType === ItemType.NATIVE || item.itemType === ItemType.ERC20;
