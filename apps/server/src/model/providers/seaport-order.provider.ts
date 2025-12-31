import { SeaportOrder } from '@/model/entities';

export const seaportOrderProvider = {
  provide: 'SEAPORT_ORDER_REPOSITORY',
  useValue: SeaportOrder,
};
