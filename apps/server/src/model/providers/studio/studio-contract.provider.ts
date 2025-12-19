import { StudioContract } from '@/model/entities/studio/studio-contract.entity';

export const studioContractProvider = {
  provide: 'STUDIO_CONTRACT_REPOSITORY',
  useValue: StudioContract,
};
