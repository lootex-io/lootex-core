import { LootexAirdropEvent } from '@/model/entities';

export const lootexAirdropEventProvider = {
  provide: 'LOOTEX_AIR_EVENT_REPOSITORY',
  useValue: LootexAirdropEvent,
};
