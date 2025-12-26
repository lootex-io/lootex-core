import MarkdownPage from '@/components/markdown-page';
import { getMarkdownContent } from '@/lib/markdown';
import { config } from '@/lib/config';

export const metadata = {
  title: 'Privacy Policy',
  description: 'Our privacy policy and data handling practices',
};

export default async function PrivacyPage() {
  const content = await getMarkdownContent(config.privacyMarkdown);
  return <MarkdownPage content={content} />;
}
