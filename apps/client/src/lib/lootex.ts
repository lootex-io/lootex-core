import { createLootexClient } from '@lootex-core/sdk';
import { createApiClient } from '@lootex-core/sdk/api';

export const lootex = createLootexClient({
  baseUrl:
    typeof window === 'undefined'
      ? process.env.API_INTERNAL_BASE_URL ??
        process.env.NEXT_PUBLIC_LOOTEX_API_BASE_URL
      : process.env.NEXT_PUBLIC_LOOTEX_API_BASE_URL,
});

export const apiClient = createApiClient({
  client: lootex,
});
