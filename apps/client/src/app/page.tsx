import Homepage from '@/features/homepage';
import { homepageData } from '@/lib/cms';

export default function Home() {
  return <Homepage homepage={homepageData} />;
}
