import { getCloudfrontUrl } from '@/lib/image';
import type { Metadata } from 'next';

const origin = process.env.NEXT_PUBLIC_DEPLOY_ORIGIN || 'https://biru.gg';
const isProduction =
  process.env.NEXT_PUBLIC_LOOTEX_ENVIRONMENT === 'production';
const titleSuffix = ' | Biru - Soneium NFT Marketplace';
const defaultTitle = 'Biru: Soneium NFT Marketplace - Mint, Trade & Have Fun';
const defaultDescription =
  'Explore the most playful & interactive NFT marketplace on Soneium! Mint, trade, and connect with a vibrant community—all in one place. CHEERS! 🍻';

export const populateMetadata = ({
  title,
  description,
  imageUrl,
  canonicalPath,
}: {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  canonicalPath?: string | null;
}): Metadata => {
  const _title = title ? `${title}${titleSuffix}` : defaultTitle;
  const _description = description || defaultDescription;
  const _imageUrl = imageUrl
    ? /^\/(_next|public)/.test(imageUrl)
      ? imageUrl
      : getCloudfrontUrl({
          src: imageUrl,
          params: {
            w: 1200,
            h: 630,
            c: 'fill',
            f: 'auto',
            q: 75,
          },
        })
    : '/og.png';

  let canonicalUrl: string | undefined;
  if (canonicalPath) {
    try {
      const decodedPath = decodeURIComponent(canonicalPath);
      canonicalUrl = decodedPath.startsWith('https')
        ? decodedPath
        : new URL(decodedPath, origin).toString();
    } catch (e) {
      canonicalUrl = new URL(canonicalPath, origin).toString();
    }
  }

  return {
    title: _title,
    description: _description,
    openGraph: {
      title: _title,
      description: _description,
      images: [
        {
          url: _imageUrl,
          width: 1200,
          height: 630,
          alt: _title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: _title,
      description: _description,
      images: [_imageUrl],
    },
    robots: isProduction
      ? { index: true, follow: true }
      : { index: false, follow: false },
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),
  };
};
