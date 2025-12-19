import { LootexNftHolder } from '@/model/entities';

export const lootexNftHolderProvider = {
  provide: 'LOOTEX_NFT_HOLDER_REPOSITORY',
  useValue: LootexNftHolder,
};
