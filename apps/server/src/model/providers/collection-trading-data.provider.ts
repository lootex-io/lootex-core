import { CollectionTradingData } from '@/model/entities';

export const collectionTradingDataProvider = {
  provide: 'COLLECTION_TRADING_DATA_REPOSITORY',
  useValue: CollectionTradingData,
};
