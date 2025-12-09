'use client';

import type { Asset } from 'lootex/asset';
import { Image as ImageIcon } from 'lucide-react';

import dynamic from 'next/dynamic';

import { Image } from '@/components/image';
import useMimeType from '@/hooks/use-mime-type';
import { getCloudfrontUrl, getImageUrl } from '@/lib/image';

const ReactPlayer = dynamic(() => import('react-player/lazy'), { ssr: false });

const getViewerData = ({
  type,
  assetImageUrl,
  assetAnimationUrl,
  width,
  height,
  shouldCheckMimeType,
}: {
  type: string;
  assetImageUrl?: string;
  assetAnimationUrl?: string;
  width?: number;
  height?: number;
  shouldCheckMimeType?: boolean;
}) => {
  const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(type);
  return isVideo
    ? {
        viewerType: 'video',
        src: getCloudfrontUrl({
          src: (shouldCheckMimeType ? assetImageUrl : assetAnimationUrl) || '',
          params: {
            w: width,
            h: height,
            f: 'auto',
            c: 'fill',
            q: 75,
          },
        }),
      }
    : { viewerType: 'image', src: getImageUrl(assetImageUrl ?? '') };
};

const AssetViewer = ({
  asset,
  width = 800,
  height = 800,
}: {
  asset?: Asset;
  width?: number;
  height?: number;
}) => {
  if (!asset) {
    return (
      <div className="flex items-center justify-center aspect-square overflow-hidden bg-secondary">
        <ImageIcon className="w-8 h-8" color="#4D4D4D" />
      </div>
    );
  }

  const { assetAnimationType, assetAnimationUrl, assetImageUrl, assetName } =
    asset;

  const shouldCheckMimeType =
    assetAnimationType === 'unknown' && !!assetImageUrl;

  const { data: mimeType } = useMimeType(
    { url: assetImageUrl ?? '' },
    { enabled: shouldCheckMimeType },
  );

  const type = shouldCheckMimeType
    ? (mimeType ?? '')
    : (assetAnimationType ?? '');

  const { viewerType, src } = getViewerData({
    type,
    assetImageUrl,
    assetAnimationUrl,
    width,
    height,
    shouldCheckMimeType,
  });

  return (
    <div className="flex items-center justify-center aspect-square overflow-hidden bg-secondary">
      {(viewerType === 'image' && (
        <Image src={src} alt={assetName ?? 'asset'} className="w-full h-full" />
      )) ||
        (viewerType === 'video' && (
          <ReactPlayer
            width="100%"
            height="100%"
            url={src}
            loop
            muted
            playsinline
            playing
            controls
          />
        ))}
    </div>
  );
};

export default AssetViewer;
