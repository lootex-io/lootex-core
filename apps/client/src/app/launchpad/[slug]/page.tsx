import { LaunchpadPage } from '@/features/launchpad/launchpad-page';
import { serverSideApiClient } from '@/lib/lootex';
import { populateMetadata } from '@/utils/metadata';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import { notFound } from 'next/navigation';

export const revalidate = 60;

const getData = async (slug: string) => {
  const [drop, collection] = await Promise.all([
    serverSideApiClient.collections.getCollectionDropInfo({ slug }),
    serverSideApiClient.collections.getCollection(slug) as Promise<
      LootexCollection & {
        isRevealable: boolean;
        canRevealAt: string;
        revealUrl: string;
        isStakeable: boolean;
        stakeUrl: string;
      }
    >,
  ]);

  if (!collection.isDrop) {
    notFound();
  }

  return { drop, collection };
};

export const generateMetadata = async ({
  params,
}: {
  params: { slug: string };
}) => {
  try {
    const { collection, drop } = await getData(params.slug);
    return populateMetadata({
      title: collection?.name,
      description: drop?.contract?.dropDescription || collection?.description,
      imageUrl: drop?.contract?.dropUrls?.[0] || collection?.bannerImageUrl,
      canonicalPath: `/launchpad/${params.slug}`,
    });
  } catch (error) {
    return {};
  }
};

export default async function Page({ params }: { params: { slug: string } }) {
  try {
    const { drop, collection } = await getData(params.slug);
    return <LaunchpadPage drop={drop} collection={collection} />;
  } catch (error) {
    notFound();
  }
}
