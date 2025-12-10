import { AssetAsEthAccount } from '@/model/entities';

export const assetAsEthAccountProvider = {
  provide: 'ASSET_AS_ETH_ACCOUNT_REPOSITORY',
  useValue: AssetAsEthAccount,
};
