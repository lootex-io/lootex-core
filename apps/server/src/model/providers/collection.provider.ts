import { Collection } from '@/model/entities';

export const collectionProvider = {
  provide: 'COLLECTION_REPOSITORY',
  useValue: Collection,
};
