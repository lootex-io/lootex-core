import { CollectionTradingBoardOneWeek } from '@/model/entities';

export const collectionTradingBoardOneWeekProvider = {
  provide: 'COLLECTION_TRADING_BOARD_ONE_WEEK_REPOSITORY',
  useValue: CollectionTradingBoardOneWeek,
};
