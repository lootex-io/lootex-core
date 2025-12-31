import { TradingRecordLog } from '@/model/entities';

export const tradingRecordLogProvider = {
  provide: 'TRADING_RECORD_LOG_REPOSITORY',
  useValue: TradingRecordLog,
};
