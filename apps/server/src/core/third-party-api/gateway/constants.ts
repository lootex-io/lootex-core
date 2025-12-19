export enum ContractType {
  ERC1155 = 'ERC1155',
  ERC721 = 'ERC721',
  UNKNOWN = 'UNKNOWN',
}

export const DEFAULT_LIMIT = 30;

export enum Priority {
  HIGH = 1, // call moralis
  NORMAL = 2,
  LOW = 3,
}

export enum QueryFlag {
  URI = 'uri',
  METADATA = 'metadata',
}
