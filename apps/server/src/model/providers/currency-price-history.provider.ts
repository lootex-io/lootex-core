import { CurrencyPriceHistory } from '@/model/entities';

export const currencyPriceProvider = {
  provide: 'CURRENCY_PRICE_REPOSITORY',
  useValue: CurrencyPriceHistory,
};
