import { Blockchain } from '@/model/entities';

export const blockchainProvider = {
  provide: 'BLOCKCHAIN_REPOSITORY',
  useValue: Blockchain,
};
