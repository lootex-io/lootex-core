import crypto from 'crypto';

export type ImageLoaderOptions = {
  src: string;
  width?: number;
  quality?: number | string;
  crop?: boolean;
  containerWidth?: number;
  containerHeight?: number;
  params?: Record<string, any>;
};

const { deviceSizes, imageSizes } = process.env
  .__NEXT_IMAGE_OPTS as unknown as {
  deviceSizes: number[];
  imageSizes: number[];
};

const sizes = [...deviceSizes, ...imageSizes].sort((a, b) => a - b);

export const getBreakpoint = (input?: number) =>
  sizes.sort((a, b) => a - b).find((s) => s > (input || 0)) ||
  sizes[sizes.length - 1];

export const getImageUrl = (url: string) => {
  return ipfsLoader(url).replace(
    'https://lootex-dev-s3-cdn.imgix.net',
    'https://lootex-dev.s3.amazonaws.com',
  );
};

// Converts whatever 3rd party ipfs to Lootex Pinata gateway
// const pinataGateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY
// export const pinataLoader = (url: string) => {
//   return url
//     .replace(/^ipfs:\/\//, `${pinataGateway}/`)
//     .replace(/^ipfs:\/\/ipfs\//, `${pinataGateway}/`)
//     .replace(/^https:\/\/gateway.pinata.cloud\/ipfs/, `${pinataGateway}`)
//     .replace(/^https:\/\/maticpunks.mypinata.cloud\/ipfs/, `${pinataGateway}`)
//     .replace(/^https:\/\/ipfs.infura.io\/ipfs/, `${pinataGateway}`)
//     .replace(/^https:\/\/ipfs.moralis.io:2053\/ipfs/, `${pinataGateway}`)
//     .replace(/^https:\/\/(.*)\.ipfs\.nftstorage\.link/, `${pinataGateway}/$1`);
// };

export const ipfsGateway =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io/ipfs';

export const ipfsLoader = (input: string) => {
  const url = input ?? '';
  const gateway = ipfsGateway.replace(/\/$/, '');
  return url
    .replace(/https:\/\/lootex\.mypinata\.cloud\/ipfs\//, `${gateway}/`)
    .replace(/^ipfs:\/\/ipfs\//, `${gateway}/`)
    .replace(/^ipfs:\/\//, `${gateway}/`)
    .replace(/^https:\/\/gateway\.pinata\.cloud\/ipfs/, `${gateway}/`)
    .replace(/^https:\/\/maticpunks\.mypinata\.cloud\/ipfs/, `${gateway}/`)
    .replace(/^https:\/\/ipfs\.infura\.io\/ipfs/, `${gateway}/`)
    .replace(/^https:\/\/ipfs\.moralis\.io:2053\/ipfs/, `${gateway}/`)
    .replace(
      /^https:\/\/(.*)\.ipfs\.nftstorage\.link/,
      (_, cid) => `${gateway}/${cid.replace(/^\/+/, '')}`,
    );
};

export const smartEncodeURI = ({
  rawUrl,
  isCloudfront = true,
}: {
  rawUrl: string;
  isCloudfront?: boolean;
}): string => {
  try {
    const url = new URL(rawUrl);

    url.pathname = url.pathname
      .split('/')
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join('/');

    let finalUrl = url.toString();
    // Remove trailing slash or encoded slash
    finalUrl = finalUrl.replace(/(%2F|\/)+$/, '');

    return isCloudfront ? encodeURIComponent(finalUrl) : finalUrl;
  } catch {
    return isCloudfront ? encodeURIComponent(rawUrl) : encodeURI(rawUrl);
  }
};

const kebabCase = (str: string) =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

const isVideoUrl = (src: string) => /\.(mp4|webm|quicktime)$/i.test(src);

const buildTransformation = (params: Record<string, any>) => {
  const order = ['f', 'q', 'c', 'w', 'h'];
  const entries = Object.entries(params).filter(
    ([key, value]) => !!key && value !== undefined && value !== null,
  );
  entries.sort(([a], [b]) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });
  return entries.map(([key, value]) => `${kebabCase(key)}_${value}`).join('/');
};

const cloudfrontDomain = process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN;
const cloudfrontSecret = process.env.NEXT_PUBLIC_CLOUDFRONT_SECRET;
const maxWidth = 1920;

const buildCloudfrontUrl = (
  baseUrl: string,
  url: string,
  isSelfHosted: boolean,
  isExternal: boolean,
  isVideo: boolean,
  params: Record<string, any>,
) => {
  const transformation = buildTransformation(params);
  const transformationPath = transformation ? `${transformation}/` : '';

  const encodedUrl = isSelfHosted ? url : smartEncodeURI({ rawUrl: url });
  const path = `/image/fetch/${transformationPath}v1/${encodedUrl}`;

  const signatureBase = `${path}?${cloudfrontSecret}`;
  const signature = crypto
    .createHash('md5')
    .update(signatureBase)
    .digest('hex');

  return `${baseUrl}/image/fetch/${transformationPath}v1/${encodedUrl}?${new URLSearchParams(
    {
      s: signature,
    },
  )}`;
};

export const getCloudfrontUrl = ({
  baseUrl = cloudfrontDomain ?? '',
  src,
  isVideo = false,
  params = {},
}: {
  baseUrl?: string;
  src: string;
  isVideo?: boolean;
  params?: Record<string, any>;
}) => {
  const transformedUrl = getImageUrl(src);

  if (!/^https:/.test(transformedUrl)) return '';

  const isSelfHosted = new RegExp(cloudfrontDomain ?? '').test(src);
  const isIPFS = src.includes('ipfs');
  const isExternal = isIPFS || !new RegExp(baseUrl).test(transformedUrl);
  const _isVideo = isVideo || isVideoUrl(src);

  return buildCloudfrontUrl(
    baseUrl,
    transformedUrl,
    isSelfHosted,
    isExternal,
    _isVideo,
    params,
  );
};

export const cloudfrontLoader = ({
  src,
  width = maxWidth,
  quality = 75,
  containerWidth,
  containerHeight,
  crop,
  params: loaderParams = {},
}: ImageLoaderOptions) => {
  if (!src) return '';

  const isNextStatic = /^\/_next/.test(src);
  const isVideo = isVideoUrl(src);

  if (isNextStatic) {
    // Bypass Next.js warning when the loader returns an unmodified src
    return `${src}?`;
  }

  const safeWidth = Math.min(width, maxWidth);
  const safeContainerWidth = containerWidth
    ? Math.min(getBreakpoint(containerWidth), maxWidth)
    : safeWidth;

  const params = {
    f: 'auto',
    q: quality ?? 75,
    ...(crop
      ? {
          c: 'crop',
          w: safeContainerWidth,
          ...(containerHeight && { h: getBreakpoint(containerHeight) }),
        }
      : {
          c: 'fill',
          w: safeWidth,
        }),
    ...loaderParams,
  };

  return getCloudfrontUrl({
    src,
    isVideo,
    params,
  });
};
