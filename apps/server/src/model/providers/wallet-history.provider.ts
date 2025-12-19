import { WalletHistory } from '@/model/entities';

export const walletHistoryProvider = {
  provide: 'WALLET_HISTORY_REPOSITORY',
  useValue: WalletHistory,
};
