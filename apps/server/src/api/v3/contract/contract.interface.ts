// request params
export interface RequestParams {
  address: string;
}

// response
export interface ContractOneResponse {
  name?: string;
  address?: string;
  schemaName?: string;
  symbol?: string;
  chainId?: string;
  imageUrl?: string;
}
