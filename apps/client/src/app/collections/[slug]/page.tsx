import CollectionBrowser from '@/features/collection-browser';
import { apiClient } from '@/lib/lootex';
import { populateMetadata } from '@/utils/metadata';
import type { LootexCollection } from '@/sdk/exports/collection';
import { notFound } from 'next/navigation';

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  try {
    const data = await apiClient.collections.getCollection(params.slug);
    return populateMetadata({
      title: data.name,
      description: data.description,
      imageUrl: data.bannerImageUrl,
      canonicalPath: `/collections/${params.slug}`,
    });
  } catch (error) {
    return {};
  }
}

export default async function CollectionPage({
  params,
}: {
  params: { slug: string };
}) {
  try {
    const data = (await apiClient.collections.getCollection(
      params.slug
    )) as LootexCollection & {
      isRevealable: boolean;
      canRevealAt: string;
      revealUrl: string;
      isStakeable: boolean;
      stakeUrl: string;
    };
    return <CollectionBrowser collection={data} />;
  } catch (error) {
    notFound();
  }
}
