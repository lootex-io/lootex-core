import { CollectionTradingBoardOneHour } from '@/model/entities';

export const collectionTradingBoardOneHourProvider = {
  provide: 'COLLECTION_TRADING_BOARD_ONE_HOUR_REPOSITORY',
  useValue: CollectionTradingBoardOneHour,
};
