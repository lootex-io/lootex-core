import { AssetExtra } from '@/model/entities';

export const assetExtraProvider = {
  provide: 'ASSET_EXTRA_REPOSITORY',
  useValue: AssetExtra,
};
