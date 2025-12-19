export enum ContractStatus {
  Unpublished = 'Unpublished',
  Publishing = 'Publishing',
  Published = 'Published',
  Sale = 'Sale',
  SaleEnd = 'SaleEnd',
}

export interface LaunchpadContracts {
  id: string;
  name: string;
  chainId: string;
  status: ContractStatus;
  dropUrls: string[];
  address: string;
  schemaName: string;
  startTime: string;
  price: string;
  currencyAddress: string;
  currencySymbol: string;
  maxSupply: string;
  totalSupply: string;
  tokenId: string;
  collectionId: string;
  collectionContractAddress: string;
  collectionBannerImageUrl: string;
  collectionLogoImageUrl: string;
  collectionName: string;
  collectionSlug: string;
  collectionDescription: string;
  collectionIsVerified: string;
  collectionChainShortName: string;
  collectionIsMinting: string;
  collectionIsDrop: string;
}
