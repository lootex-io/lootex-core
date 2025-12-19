import { CollectionVolumeToday } from '@/model/entities';

export const collectionVolumeTodayProvider = {
  provide: 'COLLECTION_VOLUME_TODAY_REPOSITORY',
  useValue: CollectionVolumeToday,
};
