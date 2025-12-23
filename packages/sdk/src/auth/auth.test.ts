import { describe, expect, it } from 'vitest';

import { http, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

import { Client } from '../client/index.js';
import { createAuth } from './auth.js';

const lootex = new Client({});

const testAccountAddress = '0xbF6692795A07684147838fC54A2764aa884C440c';
const testPrivateKey =
  '0xaf0c212028bfa11730cd07b0a3cffc569cd2ec3b36703c367001cde03a1f58b5';

const account = privateKeyToAccount(testPrivateKey);

const walletClient = createWalletClient({
  account,
  transport: http(),
  chain: polygon,
});

describe('auth', () => {
  it('should create auth client', () => {
    const auth = createAuth({
      client: lootex,
    });

    expect(auth).toBeDefined();
  });

  it('should sign in', async () => {
    const auth = createAuth({
      client: lootex,
    });

    const { message, payload } = await auth.getSignInPayload({
      address: testAccountAddress,
    });

    expect(message).toBeDefined();
    expect(payload).toBeDefined();

    const signature = await walletClient.signMessage({
      message,
    });

    const account = await auth.signIn({
      signature,
      payload,
    });

    expect(account).toBeDefined();
  });
});
