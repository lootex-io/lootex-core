import { SeaportOrderHistory } from '@/model/entities';

export const seaportOrderHistoryProvider = {
  provide: 'SEAPORT_ORDER_HISTORY_REPOSITORY',
  useValue: SeaportOrderHistory,
};
