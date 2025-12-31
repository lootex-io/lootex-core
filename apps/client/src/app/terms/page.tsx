import MarkdownPage from '@/components/markdown-page';
import { getMarkdownContent } from '@/lib/markdown';
import { config } from '@/lib/config';

export const metadata = {
  title: 'Terms of Service',
  description: 'Terms of service and conditions for using our platform',
};

export default async function TermsPage() {
  const content = await getMarkdownContent(config.termsMarkdown);
  return <MarkdownPage content={content} />;
}
