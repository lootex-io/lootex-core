import type { createRequest } from '../request.js';

export type GetCurrencyRatesParams = Record<string, never>;
export type GetCurrencyRatesResponse = Record<string, number>;

export type ReportParams = {
  reason: string;
  sourceId: string | undefined;
  type: 'Media' | 'Collection';
  url: string;
};

export type SyncTxHashParams = {
  chainId: number;
  txHash: `0x${string}`;
};

export type SyncOrderParams = {
  hash: `0x${string}`;
  chainId?: number;
  exchangeAddress: `0x${string}`;
};

export type CurrencyHistoryTime = 'hour' | '4hour' | 'day';
export type GetCurrencyHistoryParams = {
  symbol: string;
  time: CurrencyHistoryTime;
  limit: number;
};
export type GetCurrencyHistoryResponse = {
  currencyPriceHistory: {
    time: string;
    price: string;
  }[];
};

export const createMiscEndpoints = (
  request: ReturnType<typeof createRequest>,
) => ({
  report: (params: ReportParams) => {
    return request<string>({
      method: 'POST',
      path: '/v3/report',
      body: params,
    });
  },
  getRates: () => {
    return request<GetCurrencyRatesResponse>({
      method: 'GET',
      path: '/v3/currency/all-pairs',
    });
  },
  syncTxHash: async (params: SyncTxHashParams) => {
    return request<boolean>({
      method: 'PUT',
      path: `/v3/orders/sync/${params.chainId}/${params.txHash}`,
    });
  },
  syncOrder: async (params: SyncOrderParams) => {
    return request({
      method: 'GET',
      path: '/v3/orders/sync',
      query: params,
    });
  },
  getCurrencyHistory: (params: GetCurrencyHistoryParams) => {
    return request<GetCurrencyHistoryResponse>({
      method: 'GET',
      path: '/v3/currency/history',
      query: params,
    });
  },
});
