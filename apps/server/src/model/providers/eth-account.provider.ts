import { EthAccount } from '@/model/entities';

export const ethAccountProvider = {
  provide: 'ETH_ACCOUNT_REPOSITORY',
  useValue: EthAccount,
};
