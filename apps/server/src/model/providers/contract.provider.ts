import { Contract } from '@/model/entities';

export const contractProvider = {
  provide: 'CONTRACT_REPOSITORY',
  useValue: Contract,
};
