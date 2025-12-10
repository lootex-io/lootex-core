import { AccountBadge } from '@/model/entities';

export const accountBadgeProvider = {
  provide: 'ACCOUNT_BADGE_REPOSITORY',
  useValue: AccountBadge,
};
