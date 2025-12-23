import type { Client } from '../client/index.js';
import { createAccountEndpoints } from './endpoints/account.js';
import { createAssetEndpoints } from './endpoints/asset.js';
import { createAuthEndpoints } from './endpoints/auth.js';
import { createCollectionEndpoints } from './endpoints/collection.js';
import { createExploreEndpoints } from './endpoints/explore.js';
import { createMiscEndpoints } from './endpoints/misc.js';
import { createOrderEndpoints } from './endpoints/order.js';
import { createStudioEndpoints } from './endpoints/studio.js';
import { createRequest } from './request.js';

export type ApiClient = ReturnType<typeof createApiClient>;

export const createApiClient = ({
  client,
  customHeaders,
}: {
  client: Client;
  customHeaders?: Record<string, string>;
}) => {
  const request = createRequest({
    baseUrl: client.baseUrl,
    customHeaders: {
      ...client.customHeaders,
      ...customHeaders,
    },
  });

  return {
    request, // you can build your own endpoints with request outside SDK
    accounts: createAccountEndpoints(request),
    assets: createAssetEndpoints(request),
    auth: createAuthEndpoints(request),
    collections: createCollectionEndpoints(request),
    explore: createExploreEndpoints(request),
    misc: createMiscEndpoints(request),
    orders: createOrderEndpoints(request),
    studio: createStudioEndpoints(request),
  } as const;
};
