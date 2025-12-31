import { Asset } from '@/model/entities';

export const assetProvider = {
  provide: 'ASSET_REPOSITORY',
  useValue: Asset,
};
