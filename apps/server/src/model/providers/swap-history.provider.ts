import { SwapHistory } from '@/model/entities';

export const swapHistoryProvider = {
  provide: 'SWAP_HISTORY_REPOSITORY',
  useValue: SwapHistory,
};
