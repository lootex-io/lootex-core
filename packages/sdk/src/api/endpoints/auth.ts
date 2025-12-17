import type { Account } from '../../account/types.js';
import type { createRequest } from '../request.js';

export type SignInParams = {
  chainFamily: 'ETH';
  provider: string;
  transport: string;
  address: `0x${string}`;
  isErc1271Wallet: boolean;
  message: string;
  signature: `0x${string}`;
  chainId: number;
};

export type SignInResponse = Account;

export type GetSignInChallengeParams = {
  address: `0x${string}`;
  chainFamily: string;
};

export type GetSignInChallengeResponse = {
  challenge: string;
};

export type CheckIsWalletAvailableParams = {
  address: `0x${string}`;
};

export type CheckIsEmailAvailableParams = {
  email: string;
};

export type CheckIsUsernameAvailableParams = {
  username: string;
};

export type RequestOtpCodeParams = {
  email: string;
  recaptchaToken: string;
};
export type RequestOtpCodeResponse = boolean;

export type SignInPrivyParams = {
  accessToken: string;
};
export type SignInPrivyResponse = Account;

export type SignUpParams = SignInParams & {
  username?: string;
  email: string;
  otpCode: string;
  referralCode?: string;
};
export type SignUpResponse = Account;

export type SignUpPrivyParams = {
  username: string;
  referralCode?: string;
  accessToken: string;
};
export type SignUpPrivyResponse = Account;

export type DisconnectSocialAccountParams = {
  provider: string;
};

export const createAuthEndpoints = (
  request: ReturnType<typeof createRequest>,
) => ({
  checkIsWalletAvailable: async (params: CheckIsWalletAvailableParams) => {
    return request<boolean>({
      method: 'GET',
      path: '/v3/auth/wallets/available',
      query: params,
    });
  },
  checkIsEmailAvailable: async (params: CheckIsEmailAvailableParams) => {
    return request<boolean>({
      method: 'GET',
      path: '/v3/auth/email/available',
      query: params,
    });
  },
  checkIsUsernameAvailable: async (params: CheckIsUsernameAvailableParams) => {
    return request<boolean>({
      method: 'GET',
      path: '/v3/auth/username/available',
      query: params,
    });
  },
  getSignInChallenge: async (params: GetSignInChallengeParams) => {
    return request<GetSignInChallengeResponse>({
      method: 'GET',
      path: '/v3/auth/challenge/get',
      query: params,
    });
  },
  requestOtpCode: async (params: RequestOtpCodeParams) => {
    return request<RequestOtpCodeResponse>({
      method: 'GET',
      path: '/v3/auth/email/send',
      query: params,
    });
  },
  signIn: async (params: SignInParams) => {
    return request<SignInResponse>({
      method: 'POST',
      path: '/v3/auth/web3/sign-in',
      body: params,
    });
  },
  signInNewWallet: async (params: SignUpParams) => {
    return request<SignUpResponse>({
      method: 'POST',
      path: '/v3/auth/web3/new-wallet-sign-in',
      body: params,
    });
  },
  signInPrivy: async (params: SignInPrivyParams) => {
    return request<SignInPrivyResponse>({
      method: 'POST',
      path: '/v3/auth/web3/sign-in/privy',
      customHeaders: {
        Authorization: `Bearer ${params.accessToken}`,
      },
    });
  },
  signUpPrivy: async (params: SignUpPrivyParams) => {
    const { accessToken, ...rest } = params;
    return request<SignUpPrivyResponse>({
      method: 'POST',
      path: '/v3/auth/web3/sign-up-privy',
      body: rest,
      customHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  },
  bindPrivy: async (params: SignInPrivyParams) => {
    return request<SignInPrivyResponse>({
      method: 'POST',
      path: '/v3/auth/web3/new-wallet-sign-in-privy',
      customHeaders: {
        Authorization: `Bearer ${params.accessToken}`,
      },
    });
  },
  signUp: async (params: SignUpParams) => {
    return request<SignUpResponse>({
      method: 'POST',
      path: '/v3/auth/web3/sign-up',
      body: params,
    });
  },
  signOut: async () => {
    return request<void>({
      method: 'GET',
      path: '/v3/auth/web3/sign-out',
    });
  },
  disconnectSocialAccount: async (params: DisconnectSocialAccountParams) => {
    return request<boolean>({
      method: 'PUT',
      path: `/v3/auth/social-disconnect/${params.provider}`,
    });
  },
});
