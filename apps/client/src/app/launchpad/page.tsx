import LaunchpadList from '@/features/launchpad/launchpad-list';
import { launchpadData } from '@/lib/cms';
import { populateMetadata } from '@/utils/metadata';

export const generateMetadata = () => {
  return populateMetadata({
    title: 'Launchpad',
    canonicalPath: '/launchpad',
  });
};

export default function LaunchpadPage() {
  return <LaunchpadList heroBanners={launchpadData.heroBanners} />;
}
