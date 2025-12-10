import { CollectionTradingBoardOneMonth } from '@/model/entities';

export const collectionTradingBoardOneMonthProvider = {
  provide: 'COLLECTION_TRADING_BOARD_ONE_MONTH_REPOSITORY',
  useValue: CollectionTradingBoardOneMonth,
};
