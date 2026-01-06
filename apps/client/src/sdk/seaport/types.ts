export type BigNumberish = string | number | bigint;

export enum OrderType {
  FULL_OPEN = 0, // No partial fills, anyone can execute
  PARTIAL_OPEN = 1, // Partial fills supported, anyone can execute
  FULL_RESTRICTED = 2, // No partial fills, only offerer or zone can execute
  PARTIAL_RESTRICTED = 3,
}

export enum ItemType {
  NATIVE = 0,
  ERC20 = 1,
  ERC721 = 2,
  ERC1155 = 3,
  ERC721_WITH_CRITERIA = 4,
  ERC1155_WITH_CRITERIA = 5,
}

export declare const EIP_712_ORDER_TYPE: {
  OrderComponents: {
    name: string;
    type: string;
  }[];
  OfferItem: {
    name: string;
    type: string;
  }[];
  ConsiderationItem: {
    name: string;
    type: string;
  }[];
};

export declare const EIP_712_BULK_ORDER_TYPE: {
  BulkOrder: {
    name: string;
    type: string;
  }[];
  OrderComponents: {
    name: string;
    type: string;
  }[];
  OfferItem: {
    name: string;
    type: string;
  }[];
  ConsiderationItem: {
    name: string;
    type: string;
  }[];
};

export type BasicErc721Item = {
  itemType: ItemType.ERC721;
  token: `0x${string}`;
  identifier: string;
};
export type Erc721ItemWithCriteria = {
  itemType: ItemType.ERC721;
  token: `0x${string}`;
  amount?: string;
  endAmount?: string;
} & (
  | {
      identifiers: string[];
    }
  | {
      criteria: string;
    }
);
type Erc721Item = BasicErc721Item | Erc721ItemWithCriteria;
export type BasicErc1155Item = {
  itemType: ItemType.ERC1155;
  token: `0x${string}`;
  identifier: string;
  amount: string;
  endAmount?: string;
};
export type Erc1155ItemWithCriteria = {
  itemType: ItemType.ERC1155;
  token: `0x${string}`;
  amount: string;
  endAmount?: string;
} & (
  | {
      identifiers: string[];
    }
  | {
      criteria: string;
    }
);
type Erc1155Item = BasicErc1155Item | Erc1155ItemWithCriteria;
export type CurrencyItem = {
  token?: `0x${string}`;
  amount: string;
  endAmount?: string;
};
export type CreateInputItem = Erc721Item | Erc1155Item | CurrencyItem;
export type ConsiderationInputItem = CreateInputItem & {
  recipient?: `0x${string}`;
};

export type InputCriteria = {
  identifier: string;
  proof: string[];
};

export type OfferItem = {
  itemType: ItemType;
  token: `0x${string}`;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
};

export type ConsiderationItem = {
  itemType: ItemType;
  token: `0x${string}`;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
  recipient: `0x${string}`;
};

export type OrderParameters = {
  offerer: string;
  zone: string;
  orderType: OrderType;
  startTime: BigNumberish;
  endTime: BigNumberish;
  zoneHash: string;
  salt: string;
  offer: OfferItem[];
  consideration: ConsiderationItem[];
  totalOriginalConsiderationItems: BigNumberish;
  conduitKey: string;
};

export type Order = {
  parameters: OrderParameters;
  signature: string;
};

export type AdvancedOrder = Order & {
  numerator: bigint;
  denominator: bigint;
  extraData: string;
};

export type OrderComponents = OrderParameters & {
  counter: BigNumberish;
};

export type OrderWithCounter = {
  parameters: OrderComponents;
  signature: string;
};

export type SeaportOrder = OrderWithCounter;
