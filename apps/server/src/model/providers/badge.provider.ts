import { Badge } from '@/model/entities';

export const badgeProvider = {
  provide: 'BADGE_REPOSITORY',
  useValue: Badge,
};
