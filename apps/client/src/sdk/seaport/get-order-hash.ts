import { concat, keccak256, pad, stringToHex, toHex } from 'viem';
import type { OrderComponents } from './types';

export const getOrderHash = (orderComponents: OrderComponents) => {
  const offerItemTypeString =
    'OfferItem(uint8 itemType,address token,uint256 identifierOrCriteria,uint256 startAmount,uint256 endAmount)';
  const considerationItemTypeString =
    'ConsiderationItem(uint8 itemType,address token,uint256 identifierOrCriteria,uint256 startAmount,uint256 endAmount,address recipient)';
  const orderComponentsPartialTypeString =
    'OrderComponents(address offerer,address zone,OfferItem[] offer,ConsiderationItem[] consideration,uint8 orderType,uint256 startTime,uint256 endTime,bytes32 zoneHash,uint256 salt,bytes32 conduitKey,uint256 counter)';
  const orderTypeString = `${orderComponentsPartialTypeString}${considerationItemTypeString}${offerItemTypeString}`;

  // Use viem's keccak256 for hashing
  const offerItemTypeHash = keccak256(stringToHex(offerItemTypeString));

  const considerationItemTypeHash = keccak256(
    stringToHex(considerationItemTypeString),
  );
  const orderTypeHash = keccak256(stringToHex(orderTypeString));

  // Hash offer items
  const offerHash = keccak256(
    concat(
      orderComponents.offer.map((offerItem) => {
        return keccak256(
          concat([
            offerItemTypeHash,
            pad(toHex(offerItem.itemType), { size: 32 }),
            pad(offerItem.token.toLowerCase() as `0x${string}`, { size: 32 }),
            pad(toHex(BigInt(offerItem.identifierOrCriteria)), { size: 32 }),
            pad(toHex(BigInt(offerItem.startAmount)), { size: 32 }),
            pad(toHex(BigInt(offerItem.endAmount)), { size: 32 }),
          ]),
        );
      }),
    ),
  );

  // Hash consideration items
  const considerationHash = keccak256(
    concat(
      orderComponents.consideration.map((considerationItem) => {
        return keccak256(
          concat([
            considerationItemTypeHash,
            pad(toHex(considerationItem.itemType), { size: 32 }),
            pad(considerationItem.token.toLowerCase() as `0x${string}`, {
              size: 32,
            }),
            pad(toHex(BigInt(considerationItem.identifierOrCriteria)), {
              size: 32,
            }),
            pad(toHex(BigInt(considerationItem.startAmount)), { size: 32 }),
            pad(toHex(BigInt(considerationItem.endAmount)), { size: 32 }),
            pad(considerationItem.recipient.toLowerCase() as `0x${string}`, {
              size: 32,
            }),
          ]),
        );
      }),
    ),
  );

  // Calculate final order hash
  const derivedOrderHash = keccak256(
    concat([
      orderTypeHash,
      pad(orderComponents.offerer.toLowerCase() as `0x${string}`, { size: 32 }),
      pad(orderComponents.zone.toLowerCase() as `0x${string}`, { size: 32 }),
      offerHash,
      considerationHash,
      pad(toHex(orderComponents.orderType), { size: 32 }),
      pad(toHex(BigInt(orderComponents.startTime)), { size: 32 }),
      pad(toHex(BigInt(orderComponents.endTime)), { size: 32 }),
      orderComponents.zoneHash as `0x${string}`,
      pad(orderComponents.salt as `0x${string}`, { size: 32 }),
      pad(orderComponents.conduitKey as `0x${string}`, { size: 32 }),
      pad(toHex(BigInt(orderComponents.counter)), { size: 32 }),
    ]),
  );

  return derivedOrderHash;
};
