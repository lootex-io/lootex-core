import { getCloudfrontUrl } from '@/lib/image';
import type { Metadata } from 'next';
import { config } from '@/lib/config';

const origin = process.env.NEXT_PUBLIC_DEPLOY_ORIGIN || config.appUrl;
const titleSuffix = ` | ${config.appName}`;
const defaultTitle = config.appName;
const defaultDescription = config.appDescription;
const defaultImageUrl = config.appOgImage;

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
    : defaultImageUrl;

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
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),
  };
};
