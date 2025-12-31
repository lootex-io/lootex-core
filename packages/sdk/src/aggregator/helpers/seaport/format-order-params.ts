import { getAddress } from 'viem';
import { ItemType } from '../../../seaport/types.js';
import { isNativeToken } from '../../../token/token.js';
import { CurrencyAmount } from '../../../utils/currency-amount.js';
import type {
  ConsiderationItemOnCreate,
  CreateOrderInput,
  FormatOrderParams,
  OfferItemOnCreate,
} from '../../types.js';
import { formatFeeConsiderations } from './fees.js';

export const formatOrderParams = ({
  tokenAddress,
  tokenId,
  tokenType,
  unitPrice: _unitPrice,
  quantity,
  duration,
  orderType,
  fees,
  accountAddress,
}: FormatOrderParams): CreateOrderInput => {
  const isListing = orderType === 'LISTING';
  const isCollectionOffer = orderType === 'COLLECTION_OFFER';

  const unitPrice = CurrencyAmount.fromFractionalAmount(
    _unitPrice.currency,
    _unitPrice.numerator,
    _unitPrice.denominator,
  );
  const currency = unitPrice.currency;
  const currencyAddress = getAddress(currency.address);
  const currencyItemType =
    ItemType[isNativeToken(currency) ? 'NATIVE' : 'ERC20'];

  const totalPriceAmount = unitPrice.multiply(quantity);

  const offerItems: OfferItemOnCreate[] = [];
  const considerationItems: ConsiderationItemOnCreate[] = [];

  const feeConsiderationItems = formatFeeConsiderations({
    fees,
    totalPrice: totalPriceAmount,
  });

  if (isListing) {
    offerItems.push({
      itemType: ItemType[tokenType],
      token: getAddress(tokenAddress),
      identifier: tokenId,
      amount: quantity.toString(),
    });

    const allFeesAmount = feeConsiderationItems.reduce(
      (acc, fee) => acc.add(CurrencyAmount.fromRawAmount(currency, fee.amount)),
      CurrencyAmount.fromRawAmount(currency, 0),
    );

    const restAmount = totalPriceAmount.subtract(allFeesAmount);

    considerationItems.push(
      {
        itemType: currencyItemType,
        amount: restAmount.quotient().toString(),
        identifier: '0',
        token: currencyAddress,
        recipient: accountAddress,
      },
      ...feeConsiderationItems,
    );
  } else {
    offerItems.push({
      itemType: currencyItemType,
      token: currencyAddress,
      identifier: '0',
      amount: totalPriceAmount.quotient().toString(),
    });

    considerationItems.push(
      {
        itemType: isCollectionOffer
          ? ItemType[tokenType] + 2
          : ItemType[tokenType],
        token: getAddress(tokenAddress),
        identifier: isCollectionOffer ? '0' : tokenId,
        amount: quantity.toString(),
        recipient: accountAddress,
      },
      ...feeConsiderationItems,
    );
  }

  return {
    offer: offerItems,
    consideration: sortConsiderations(considerationItems),
    startTime: Math.floor(Date.now() / 1000).toString(),
    endTime: Math.floor(duration.getTime() / 1000).toString(),
    allowPartialFills: true,
  };
};

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
