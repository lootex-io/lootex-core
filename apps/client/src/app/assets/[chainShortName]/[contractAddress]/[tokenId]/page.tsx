import { AssetTemplate } from '@/features/asset';
import { serverSideApiClient } from '@/lib/lootex';
import { populateMetadata } from '@/utils/metadata';
import { notFound } from 'next/navigation';

export async function generateMetadata({
  params,
}: {
  params: { chainShortName: string; contractAddress: string; tokenId: string };
}) {
  try {
    const data = await serverSideApiClient.assets.getAsset(
      `${params.chainShortName}/${params.contractAddress}/${params.tokenId}`,
    );
    return populateMetadata({
      title: data.assetName,
      description: data.assetDescription,
      imageUrl: data.assetImageUrl,
      canonicalPath: `/assets/${params.chainShortName}/${params.contractAddress}/${params.tokenId}`,
    });
  } catch (error) {
    return {};
  }
}

export const revalidate = 60;
export default async function AssetPage({
  params: { chainShortName, contractAddress, tokenId },
}: {
  params: { chainShortName: string; contractAddress: string; tokenId: string };
}) {
  try {
    const asset = await serverSideApiClient.assets.getAsset(
      `${chainShortName}/${contractAddress}/${tokenId}`,
    );
    return (
      <div className="container mx-auto max-w-screen-xl h-[calc(100dvh-56px)]">
        <AssetTemplate asset={asset} />
      </div>
    );
  } catch (error) {
    notFound();
  }
}
