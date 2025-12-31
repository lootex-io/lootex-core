import type { Account } from '../account/types.js';
import type { Asset } from '../asset/types.js';
import type { LootexCollection } from '../collection/types.js';
import type {
  ConsiderationItem,
  InputCriteria,
  OfferItem,
  OrderComponents,
  SeaportOrder,
} from '../seaport/types.js';

export type PlatformType = 0 | 1;

export type PlatformTypeName = 'Lootex' | 'OpenSea' | 'Unknown';

export type OrderCategory = 'LISTING' | 'OFFER';

export type LootexConsiderationItem = ConsiderationItem & {
  availableAmount?: string;
};

export type LootexOfferItem = OfferItem & {
  availableAmount?: string;
};

export type LootexOrder = {
  id: string;
  hash: `0x${string}`;
  chainId: number;
  exchangeAddress: `0x${string}`;
  seaportOrder: Omit<SeaportOrder, 'parameters'> & {
    parameters: Omit<OrderComponents, 'consideration'> & {
      consideration: LootexConsiderationItem[];
      offer: LootexOfferItem[];
    };
  };
  account: Pick<
    Account,
    'avatarUrl' | 'wallets' | 'username' | 'AvatarDecoration'
  >;
  assets: Asset[];
  unitsToFill: bigint;
  collections?: LootexCollection[];
  considerationCriteria: InputCriteria[];
  offerType?: 'Normal' | 'Collection';
  orderType: number;
  category: 'listing' | 'offer';
  offerer: `0x${string}`;
  price: number;
  perPrice: number;
  priceSymbol: string;
  isCancelled: boolean;
  isExpired: boolean;
  isFillable: boolean;
  isValidated: boolean;
  startTime: number;
  endTime: number;
  platformType?: PlatformType;
  currencies: {
    address: `0x${string}`;
    symbol: string;
    isNative: boolean;
    isWrapped: boolean;
    decimals: number;
    chainId: number;
  }[];
};

export type LootexOrderSimple = Pick<
  LootexOrder,
  | 'category'
  | 'hash'
  | 'id'
  | 'offerer'
  | 'perPrice'
  | 'price'
  | 'priceSymbol'
  | 'platformType'
  | 'exchangeAddress'
> &
  Pick<SeaportOrder['parameters'], 'startTime' | 'endTime'> & {
    is0PlatformFee: boolean;
  };

export type ValidatedLootexOrder = LootexOrder & {
  isOwner: boolean;
  isBlocked: boolean;
  isFillable: boolean;
  isInvalidQuantity: boolean;
  isAvailable: boolean;
};
