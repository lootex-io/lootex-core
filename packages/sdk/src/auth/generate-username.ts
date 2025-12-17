import { isAddress } from 'viem';

import { createApiClient } from '../api/api-client.js';
import type { Client } from '../client/index.js';

const generateDefaultUsername = async ({
  address,
  prefix = 'ltx',
  client,
}: {
  address: `0x${string}`;
  client: Client;
  prefix?: string;
}): Promise<string> => {
  const apiClient = createApiClient({ client });
  try {
    if (!address || !isAddress(address)) {
      throw new Error('Invalid address');
    }

    let length = 4;
    let isAvailable = false;
    let maybeUsername = '';

    while (length <= 7) {
      const extractedPart = address.toLowerCase().substring(2, 2 + length);
      maybeUsername = `${prefix}${extractedPart}`;

      isAvailable = await apiClient.auth.checkIsUsernameAvailable({
        username: maybeUsername,
      });

      if (isAvailable) {
        break;
      }

      length++;
    }

    if (!isAvailable) {
      return '';
    }

    return maybeUsername;
  } catch (err) {
    console.error(err);
    return '';
  }
};

export default generateDefaultUsername;
