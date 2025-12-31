import { getImageUrl } from '@/lib/image';
import { cloudfrontLoader } from '@/lib/image';
import { cn } from '@/lib/utils';
import NextImage, {
  type ImageLoaderProps,
  type ImageProps as NextImageProps,
} from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ImageProps = Omit<NextImageProps, 'src'> & {
  imageClassName?: string;
  src?: string;
};

export const Image = ({
  src,
  className,
  imageClassName,
  sizes,
  style,
  fill = true,
  ...props
}: ImageProps) => {
  const [isError, setIsError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{
    width?: number;
    height?: number;
  }>({});

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const loader = useCallback(
    (props: ImageLoaderProps) => {
      return cloudfrontLoader({
        ...props,
        containerWidth: containerSize.width,
        containerHeight: containerSize.height,
      });
    },
    [containerSize],
  );

  if (!src) {
    return <div className={cn('bg-secondary rounded', className)} />;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        isLoaded ? '' : 'bg-muted',
        className,
      )}
    >
      {containerSize.width && containerSize.height ? (
        isError ? (
          <NextImage
            loader={() => getImageUrl(src as string)}
            src={getImageUrl(src as string)}
            style={{
              objectFit: 'contain',
              ...style,
            }}
            sizes={sizes || `${Math.floor(containerSize?.width)}px`}
            onLoad={() => {
              setIsLoaded(true);
            }}
            className={cn(isLoaded ? '' : 'opacity-0', imageClassName)}
            fill={fill}
            {...props}
          />
        ) : (
          <NextImage
            loader={loader}
            src={getImageUrl(src as string)}
            style={{
              objectFit: 'contain',
              ...style,
            }}
            sizes={sizes || `${Math.floor(containerSize?.width)}px`}
            onError={() => {
              setIsError(true);
            }}
            onLoad={() => {
              setIsLoaded(true);
            }}
            className={cn(imageClassName)}
            fill={fill}
            {...props}
          />
        )
      ) : null}
    </div>
  );
};
