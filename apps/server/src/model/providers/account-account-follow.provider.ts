import { AccountAccountFollow } from '@/model/entities';

export const accountAccountFollowProvider = {
  provide: 'ACCOUNT_ACCOUNT_FOLLOW_REPOSITORY',
  useValue: AccountAccountFollow,
};
