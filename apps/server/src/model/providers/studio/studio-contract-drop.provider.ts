import { StudioContractDrop } from '@/model/entities/studio/studio-contract-drop.entity';

export const studioContractDropProvider = {
  provide: 'STUDIO_CONTRACT_DROP_REPOSITORY',
  useValue: StudioContractDrop,
};
