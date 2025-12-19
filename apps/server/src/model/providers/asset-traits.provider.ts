import { AssetTraits } from '@/model/entities';

export const assetTraitsProvider = {
  provide: 'ASSET_TRAITS_REPOSITORY',
  useValue: AssetTraits,
};
