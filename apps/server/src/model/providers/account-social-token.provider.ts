import { AccountSocialToken } from '@/model/entities';

export const accountSocialTokenProvider = {
  provide: 'ACCOUNT_SOCIAL_TOKEN_REPOSITORY',
  useValue: AccountSocialToken,
};
