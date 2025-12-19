import { CollectionTradingBoardOneDay } from '@/model/entities';

export const collectionTradingBoardOneDayProvider = {
  provide: 'COLLECTION_TRADING_BOARD_ONE_DAY_REPOSITORY',
  useValue: CollectionTradingBoardOneDay,
};
