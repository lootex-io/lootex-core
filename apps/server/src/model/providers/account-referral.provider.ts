import { AccountReferral } from '@/model/entities';

export const accountReferralProvider = {
  provide: 'ACCOUNT_REFERRAL_REPOSITORY',
  useValue: AccountReferral,
};
