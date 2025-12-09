import { useMediaQuery } from './use-media-query';

export function useScreenSize() {
  const isSm = useMediaQuery('(min-width: 640px)');
  const isMd = useMediaQuery('(min-width: 768px)');
  const isLg = useMediaQuery('(min-width: 1024px)');
  const isXl = useMediaQuery('(min-width: 1280px)');
  const is2Xl = useMediaQuery('(min-width: 1536px)');

  // isBase is true when screen is smaller than 'sm' breakpoint
  const isBase = !isSm;

  return {
    isBase, // < 640px
    isSm, // ≥ 640px
    isMd, // ≥ 768px
    isLg, // ≥ 1024px
    isXl, // ≥ 1280px
    is2Xl, // ≥ 1536px
  };
}
