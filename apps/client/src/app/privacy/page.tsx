import MarkdownPage from '@/components/markdown-page';
import { getMarkdownContent } from '@/lib/markdown';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Our privacy policy and data handling practices',
};

export default async function PrivacyPage() {
  const content = await getMarkdownContent('privacy.md');
  return <MarkdownPage content={content} />;
}
