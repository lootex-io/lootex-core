import { AvatarDecoration } from '@/model/entities';

export const avatarDecorationProvider = {
  provide: 'AVATAR_DECORATION_REPOSITORY',
  useValue: AvatarDecoration,
};
