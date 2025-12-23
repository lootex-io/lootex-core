import { createLootexClient } from '@lootex-core/sdk';
import { createApiClient } from '@lootex-core/sdk/api';

export const lootex = createLootexClient({
  baseUrl: process.env.NEXT_PUBLIC_LOOTEX_API_BASE_URL ?? undefined,
});

export const apiClient = createApiClient({
  client: lootex,
});
