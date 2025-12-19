import { SeaportOrderAsset } from '@/model/entities';

export const seaportOrderAssetProvider = {
  provide: 'SEAPORT_ORDER_ASSET_REPOSITORY',
  useValue: SeaportOrderAsset,
};
