import type { Client } from '../client/index';
import { createAccountEndpoints } from './endpoints/account';
import { createAssetEndpoints } from './endpoints/asset';
import { createCollectionEndpoints } from './endpoints/collection';
import { createExploreEndpoints } from './endpoints/explore';
import { createMiscEndpoints } from './endpoints/misc';
import { createOrderEndpoints } from './endpoints/order';
import { createStudioEndpoints } from './endpoints/studio';
import { createRequest } from './request';

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
    collections: createCollectionEndpoints(request),
    explore: createExploreEndpoints(request),
    misc: createMiscEndpoints(request),
    orders: createOrderEndpoints(request),
    studio: createStudioEndpoints(request),
  } as const;
};
