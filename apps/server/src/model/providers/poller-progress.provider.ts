import { PollerProgress } from '@/model/entities';

export const pollerProgressProvider = {
  provide: 'POLLER_PROGRESS_REPOSITORY',
  useValue: PollerProgress,
};
