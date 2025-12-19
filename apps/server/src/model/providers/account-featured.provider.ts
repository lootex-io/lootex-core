import { AccountFeatured } from '@/model/entities';

export const accountFeaturedProvider = {
  provide: 'ACCOUNT_FEATURED_REPOSITORY',
  useValue: AccountFeatured,
};
