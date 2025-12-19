import { Currency } from '@/model/entities';

export const currencyProvider = {
  provide: 'CURRENCY_REPOSITORY',
  useValue: Currency,
};
