import { type ApiClient, createApiClient } from '../api/api-client.js';
import type {
  RequestOtpCodeParams,
  SignInParams,
  SignInPrivyResponse,
  SignUpParams,
  SignUpPrivyParams,
} from '../api/endpoints/auth.js';
import type { Client } from '../client/index.js';

export type NewSignInPayload = Pick<
  SignUpParams,
  'email' | 'otpCode' | 'referralCode' | 'username'
>;
export type SignInPayload = Omit<SignInParams, 'signature'> &
  Partial<NewSignInPayload>;

export const createAuth = ({ client }: { client: Client }) => {
  const apiClient = createApiClient({ client });
  return {
    getSignInPayload: async ({
      address,
      email,
      otpCode,
      referralCode,
      username,
    }: {
      address: `0x${string}`;
    } & Partial<NewSignInPayload>): Promise<{
      message: string;
      payload: SignInPayload;
    }> => {
      const isNewSignIn = !!email || !!otpCode || !!username;

      // Check if the wallet is registered

      const isWalletAvailable = await apiClient.auth.checkIsWalletAvailable({
        address,
      });

      // it attempt to sign in with new wallet but without email and otpCode
      if (isWalletAvailable && !isNewSignIn) {
        throw new Error('Wallet not registered. Please sign up first.');
      }

      const { challenge } = await apiClient.auth.getSignInChallenge({
        address,
        chainFamily: 'ETH',
      });

      return {
        message: challenge,
        payload: {
          chainFamily: 'ETH', // not used but required by the API
          provider: 'METAMASK_INJECTED', // not used but required by the API
          transport: 'Injected', // not used but required by the API
          chainId: 1, // not used but required by the API
          address,
          isErc1271Wallet: false,
          message: challenge,
          ...(isNewSignIn && {
            email,
            otpCode,
            referralCode,
            username,
          }),
        },
      };
    },

    requestOtpCode: async ({ email, recaptchaToken }: RequestOtpCodeParams) => {
      return apiClient.auth.requestOtpCode({ email, recaptchaToken });
    },
    signIn: async ({
      signature,
      payload,
    }: {
      signature: `0x${string}`;
      payload: SignInPayload;
    }) => {
      if (payload.email && payload.otpCode && payload.username) {
        const isNewEmail = await apiClient.auth.checkIsEmailAvailable({
          email: payload.email,
        });

        if (isNewEmail) {
          return apiClient.auth.signUp({
            ...payload,
            email: payload.email,
            otpCode: payload.otpCode,
            username: payload.username,
            signature,
          });
        }

        return apiClient.auth.signInNewWallet({
          ...payload,
          email: payload.email,
          otpCode: payload.otpCode,
          username: payload.username,
          signature,
        });
      }

      return apiClient.auth.signIn({
        ...payload,
        signature,
      });
    },
    signInPrivy: async ({ accessToken }: { accessToken: string }) => {
      let result: SignInPrivyResponse;
      try {
        result = await apiClient.auth.signInPrivy({ accessToken });
      } catch (error) {
        try {
          result = await apiClient.auth.bindPrivy({ accessToken });
        } catch (error) {
          throw new Error('Privy login failed. Please create a new Lootex ID');
        }
      }

      return result;
    },
    signUpPrivy: async (params: SignUpPrivyParams) => {
      return apiClient.auth.signUpPrivy(params);
    },
    signOut: async () => {
      return await apiClient.auth.signOut();
    },
  };
};
