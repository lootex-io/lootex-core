import { PageContainer } from '@/components/page-container';
import Collections from '@/features/collections';
import { populateMetadata } from '@/utils/metadata';
import type { Metadata } from 'next';

export const metadata: Metadata = populateMetadata({
  title: 'Collections',
  canonicalPath: '/collections',
});

export default function CollectionsPage() {
  return (
    <PageContainer className="flex flex-col gap-3 overflow-hidden h-[calc(100dvh-56px)]">
      <h1 className="text-2xl md:text-3xl font-brand">Collections</h1>
      <Collections />
    </PageContainer>
  );
}
