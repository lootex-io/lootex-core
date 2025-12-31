import { UseQueryOptions, useQuery } from '@tanstack/react-query';
import { getImageUrl } from '@/lib/image';

const useMimeType = (
  { url }: { url: string },
  options: Omit<UseQueryOptions<string>, 'queryKey' | 'queryFn'>,
) => {
  return useQuery<string>({
    queryKey: ['get-mime-type-by-url', url],
    queryFn: async () => {
      if (!url) {
        throw new Error('No url provided');
      }

      const generalizedUrl = getImageUrl(url);
      const headers = { Range: 'bytes=0-1', accept: 'application/json' };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        const response = await fetch(generalizedUrl, {
          signal: controller.signal,
          headers,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Failed to fetch content type');
        }

        const contentType = response.headers.get('content-type');
        return contentType
          ? getTypefromGeneral(generalizedUrl, contentType)
          : 'failed';
      } catch (error) {
        console.error('Error fetching MIME type:', error);
        return 'failed';
      }
    },
    staleTime: Infinity,
    ...options,
  });
};

function getTypefromGeneral(url: string, type: string): string {
  if (['application/octet-stream', 'multipart/form-data'].includes(type)) {
    const extension = url.split('.').pop()?.toLowerCase();
    if (!extension) return '';

    switch (extension) {
      case 'mp4':
      case 'mov':
        return 'video/mp4';
      default:
        return 'image/png';
    }
  }
  return type;
}

export default useMimeType;
