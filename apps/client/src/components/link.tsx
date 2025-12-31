import { cn } from '@/lib/utils';
import NextLink, { type LinkProps } from 'next/link';
import { forwardRef } from 'react';

export const Link = forwardRef<
  HTMLAnchorElement,
  LinkProps & {
    className?: string;
    children?: React.ReactNode;
  }
>(({ href, className, children, ...props }, ref) => {
  const _href = href || '#';

  const isExternal =
    typeof _href === 'string'
      ? _href.startsWith('http')
      : typeof _href === 'object' &&
        'href' in _href &&
        _href.href &&
        _href.href.startsWith('http');

  return (
    <NextLink
      ref={ref}
      href={_href}
      target={isExternal ? '_blank' : undefined}
      className={cn(
        'text-muted-foreground hover:text-foreground inline-flex gap-2 items-center',
        className,
      )}
      {...props}
    >
      {children}
    </NextLink>
  );
});

Link.displayName = 'Link';
