import { createLootexClient } from 'lootex';
import { createApiClient } from 'lootex/api';

export const lootex = createLootexClient({
  environment:
    (process.env.NEXT_PUBLIC_LOOTEX_ENVIRONMENT as
      | 'development'
      | 'production') || 'development',
  apiKey: process.env.NEXT_PUBLIC_LOOTEX_API_KEY,
  baseUrl: process.env.NEXT_PUBLIC_LOOTEX_API_BASE_URL ?? undefined,
});

export const apiClient = createApiClient({
  client: lootex,
});

export const serverSideApiClient = createApiClient({
  client: lootex,
  ...(process.env.LOOTEX_API_CLIENT_ID && {
    customHeaders: { 'x-client-id': process.env.LOOTEX_API_CLIENT_ID },
  }),
});
