import { AccountAvatarDecoration } from '@/model/entities';

export const accountAvatarDecorationProvider = {
  provide: 'ACCOUNT_AVATAR_DECORATION_REPOSITORY',
  useValue: AccountAvatarDecoration,
};
