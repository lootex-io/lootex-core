import { CollectionVolumeThirtyDays } from '@/model/entities';

export const collectionVolumeThirtyDaysProvider = {
  provide: 'COLLECTION_VOLUME_THIRTY_DAYS_REPOSITORY',
  useValue: CollectionVolumeThirtyDays,
};
