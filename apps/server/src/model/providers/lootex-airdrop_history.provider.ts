import { LootexAirdropHistory } from '@/model/entities';

export const lootexAirdropHistoryProvider = {
  provide: 'LOOTEX_AIRDROP_HISTORY_REPOSITORY',
  useValue: LootexAirdropHistory,
};
