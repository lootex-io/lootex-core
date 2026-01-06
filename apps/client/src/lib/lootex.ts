import { createLootexClient } from '@/sdk/exports';
import { createApiClient } from '@/sdk/exports/api';

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
