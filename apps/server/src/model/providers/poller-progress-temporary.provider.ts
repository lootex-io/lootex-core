import { PollerProgressTemporary } from '@/model/entities';

export const pollerProgressTemporaryProvider = {
  provide: 'POLLER_PROGRESS_TEMPORARY_REPOSITORY',
  useValue: PollerProgressTemporary,
};
