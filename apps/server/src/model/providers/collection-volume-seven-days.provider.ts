import { CollectionVolumeSevenDays } from '@/model/entities';

export const collectionVolumeSevenDaysProvider = {
  provide: 'COLLECTION_VOLUME_SEVEN_DAYS_REPOSITORY',
  useValue: CollectionVolumeSevenDays,
};
