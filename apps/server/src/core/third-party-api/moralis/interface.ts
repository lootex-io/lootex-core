export interface MoralisResp {
  total: number;
  page: number;
  page_size: number;
  cursor: string;
}

export interface MoralisGetNftsResp extends MoralisResp {
  result: MoralisNft[];
  status: string;
}

export interface MoralisGetTokenIdsResp extends MoralisResp {
  result: MoralisTokenId[];
}

export interface MoralisGetTokenIdOwnersResp extends MoralisResp {
  result: MoralisTokenIdOwners[];
}

export interface MoralisNft {
  token_address: string; // "0xb03f5d50c126c8a65707f6fc9cae12589bbeb4c6",
  token_id: string; // "8117",
  owner_of: string; // "0xa87bf2268e149ae86f064d16596a0af09f5b50ff",
  block_number: string; // "30649217",
  block_number_minted: string; // "30649217",
  token_hash: string; // "d77317c1c6c833cd8a1bbea38911a812",
  amount: string; // "1",
  contract_type: string; // "ERC721",
  name: string; // "GF20th Adventure Pass",
  symbol: string; // "GF20AP",
  token_uri: string; // "https://storage.qubic.market/137/0xb03f5d50c126c8a65707f6fc9cae12589bbeb4c6/8117",
  metadata: string;
  last_token_uri_sync: string; // "2022-07-12T17:25:11.229Z",
  last_metadata_sync: string; // "2022-07-12T17:25:33.278Z"
  possible_spam: boolean; //
}

// NOTICE: should be identical to interface MoralisNft
export const MoralisNftKeys = [
  'token_address',
  'token_id',
  'owner_of',
  'token_hash',
  'amount',
  'contract_type',
  'name',
  'symbol',
  'token_uri',
  'metadata',
];

export const MoralisNftsByContractKeys = [
  // 'token_hash',
  // 'token_address',
  'token_id',
  // 'block_number_minted',
  // 'amount',
  // 'contract_type',
  // 'name',
  // 'symbol',
  // 'token_uri',
  // 'metadata',
  // 'last_token_uri_sync',
  // 'last_metadata_sync',
  // 'minter_address',
  // 'possible_spam',
];

export type MoralisTokenId = Omit<MoralisNft, 'block_number' | 'owner_of'>;

export interface MoralisTokenMetadata extends MoralisNft {
  transfer_index: number[];
}
export interface MoralisTokenIdOwners extends MoralisNft {
  minter_address: string;
}

export interface MoralisNftMetadatAttributes {
  trait_type: string;
  value: any;
  display_type: any;
}

export interface MoralisContract {
  token_address: string; // "0x5c6e2892ed14bd178f0928abce94c1373b8265eb",
  name: string; // "BruceTheGoose1155",
  symbol: string; // "BTGE",
  contract_type: string; // "ERC1155",
  synced_at: string; // null
}

export interface MoralisNftStatus {
  owners: {
    current: string;
  };
  transfers: {
    total: string;
  };
}

export interface MoralisCollectionStatus {
  total_tokens: string;
  owners: {
    current: string;
  };
  transfers: {
    total: string;
  };
}
