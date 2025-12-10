import { AccountFeaturedAsset } from '@/model/entities/';

export const accountFeaturedAssetProvider = {
  provide: 'ACCOUNT_FEATURED_ASSET_REPOSITORY',
  useValue: AccountFeaturedAsset,
};
