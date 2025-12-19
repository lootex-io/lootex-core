export interface TraitQuery {
  stringTraits?: Record<string, string[]>;
  numberTraits?: Record<string, number[]>;
}

export interface UpdateTrait {
  assetId: string;
  collectionId: string;
  traits: ThirdPartyAttribute[];
}

export interface GetAssetIdsByTrait {
  collectionSlug?: string;
  collectionId?: string;
  traits: Trait[];
}

export interface Trait {
  traitType?: string;
  displayType?: string;
  value?: string;
}

export interface ThirdPartyAttribute {
  trait_type: string;
  traitType?: string;
  display_type?: string;
  display?: string;
  value: string;
  type?: string; // <- CryptoKitties
  description?: string; // <- CryptoKitties
}
