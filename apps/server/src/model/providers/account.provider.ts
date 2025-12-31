import { Account } from '@/model/entities/account.entity';

export const accountProvider = {
  provide: 'ACCOUNT_REPOSITORY',
  useValue: Account,
};
