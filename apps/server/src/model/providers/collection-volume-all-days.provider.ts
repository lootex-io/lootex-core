import { CollectionVolumeAllDays } from '@/model/entities';

export const collectionVolumeAllDaysProvider = {
  provide: 'COLLECTION_VOLUME_ALL_DAYS_REPOSITORY',
  useValue: CollectionVolumeAllDays,
};
