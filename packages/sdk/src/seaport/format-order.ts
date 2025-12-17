import {
  concat,
  keccak256,
  randomBytes,
  toBeHex,
  toUtf8Bytes,
} from 'ethers-v6';
import { MerkleTree } from 'merkletreejs';
import { maxInt256, zeroAddress, zeroHash } from 'viem';
import type { CreateOrderInput } from '../aggregator/types.js';
import type {
  BigNumberish,
  CreateInputItem,
  OfferItem,
  OrderComponents,
} from './types.js';
import { ItemType, OrderType } from './types.js';

export const generateRandomSalt = (domain?: string) => {
  if (domain) {
    return toBeHex(
      concat([
        keccak256(toUtf8Bytes(domain)).slice(0, 10),
        Uint8Array.from(Array(20).fill(0)),
        randomBytes(8),
      ]),
    );
  }
  return `0x${Buffer.from(randomBytes(8)).toString('hex').padStart(64, '0')}`;
};

export const mapInputItemToOfferItem = (item: CreateInputItem): OfferItem => {
  if ('itemType' in item) {
    // Convert this to a criteria based item
    if ('identifiers' in item || 'criteria' in item) {
      const root =
        'criteria' in item
          ? item.criteria
          : new MerkleTree(item.identifiers).getRoot().toString();

      return {
        itemType:
          item.itemType === ItemType.ERC721
            ? ItemType.ERC721_WITH_CRITERIA
            : ItemType.ERC1155_WITH_CRITERIA,
        token: item.token,
        identifierOrCriteria: root,
        startAmount: item.amount ?? '1',
        endAmount: item.endAmount ?? item.amount ?? '1',
      };
    }

    if ('amount' in item || 'endAmount' in item) {
      return {
        itemType: item.itemType,
        token: item.token,
        // prevent undefined for fungible items
        identifierOrCriteria: item.identifier ?? '0',
        // @ts-ignore
        startAmount: item.amount,
        // @ts-ignore
        endAmount: item.endAmount ?? item.amount ?? '1',
      };
    }

    return {
      itemType: item.itemType,
      token: item.token,
      identifierOrCriteria: item.identifier,
      startAmount: '1',
      endAmount: '1',
    };
  }

  // Item is a currency
  return {
    itemType:
      item.token && item.token !== zeroAddress
        ? ItemType.ERC20
        : ItemType.NATIVE,
    token: item.token ?? zeroAddress,
    identifierOrCriteria: '0',
    startAmount: item.amount,
    endAmount: item.endAmount ?? item.amount,
  };
};

const getOrderTypeFromOrderOptions = ({
  allowPartialFills,
  restrictedByZone,
}: Pick<CreateOrderInput, 'allowPartialFills' | 'restrictedByZone'>) => {
  if (allowPartialFills) {
    return restrictedByZone
      ? OrderType.PARTIAL_RESTRICTED
      : OrderType.PARTIAL_OPEN;
  }

  return restrictedByZone ? OrderType.FULL_RESTRICTED : OrderType.FULL_OPEN;
};

export const formatOrder = ({
  offerer,
  conduitKey = zeroHash,
  zone = zeroAddress,
  zoneHash = zeroHash,
  startTime = Math.floor(Date.now() / 1000).toString(),
  endTime = Math.floor(Date.now() / 1000 + 60 * 60 * 24).toString(),
  offer,
  consideration,
  counter,
  allowPartialFills,
  restrictedByZone,
  domain,
  salt,
}: CreateOrderInput & { offerer: `0x${string}`; counter: BigNumberish }) => {
  const offerItems = offer.map(mapInputItemToOfferItem);
  const considerationItems = [
    ...consideration.map((consideration) => ({
      ...mapInputItemToOfferItem(consideration),
      recipient: consideration.recipient ?? offerer,
    })),
  ];

  const orderType = getOrderTypeFromOrderOptions({
    allowPartialFills,
    restrictedByZone,
  });

  const saltFollowingConditional =
    salt !== undefined
      ? `0x${toBeHex(salt).slice(2).padStart(64, '0')}`
      : generateRandomSalt(domain);

  const orderComponents: OrderComponents = {
    offerer,
    zone,
    zoneHash,
    startTime,
    endTime,
    orderType,
    offer: offerItems,
    consideration: considerationItems,
    totalOriginalConsiderationItems: considerationItems.length,
    salt: saltFollowingConditional,
    conduitKey,
    counter,
  };

  return orderComponents;
};
