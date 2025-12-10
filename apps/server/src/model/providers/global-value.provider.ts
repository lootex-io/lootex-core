import { GlobalValue } from '@/model/entities';

export const globalValueProvider = {
  provide: 'GLOBAL_VALUE_REPOSITORY',
  useValue: GlobalValue,
};
