import { Wallet } from '@/model/entities';

export const walletProvider = {
  provide: 'WALLET_REPOSITORY',
  useValue: Wallet,
};
