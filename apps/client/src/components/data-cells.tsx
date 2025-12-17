import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LootexCollection } from '@lootex-core/sdk/collection';
import { Fraction } from '@lootex-core/sdk/utils';
import NextLink from 'next/link';
import type { HTMLAttributes, ReactNode } from 'react';
import { Image } from './image';
import { Link } from './link';
import { Badge } from './ui/badge';

export const removeTrailingZeros = (value: string) => {
  return value.replace(/\.?0+$/, '');
};

export const PriceCell = ({
  price,
  symbol,
  className,
  exact,
  negative,
  decimals,
  showTooltip = true,
  threshold = 0.000001,
  symbolClassName,
}: {
  price?: string;
  symbol?: string;
  className?: string;
  exact?: boolean;
  negative?: boolean;
  decimals?: number;
  threshold?: number;
  showTooltip?: boolean;
  symbolClassName?: string;
}) => {
  if (!price) return null;

  let fraction: Fraction;

  try {
    fraction = Fraction.fromDecimal(price);
  } catch (e) {
    return null;
  }

  const intl = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals ?? 6,
    trailingZeroDisplay: 'auto',
  });

  const formattedPrice =
    fraction.lessThan(threshold) && threshold !== 0
      ? `<${threshold}`
      : intl.format(Number(price));

  const exactPrice = fraction
    ? removeTrailingZeros(fraction.toFixed(18))
    : price;
  const shouldShowTooltip = showTooltip && formattedPrice !== exactPrice;

  return exact ? (
    <span className={cn('flex items-end gap-1 flex-nowrap', className)}>
      <span className="font-bold">
        {negative ? '-' : ''}
        {exactPrice}
      </span>
      <span
        className={cn(
          'font-semibold text-muted-foreground text-[0.8em]',
          symbolClassName,
        )}
      >
        {symbol}
      </span>
    </span>
  ) : (
    <TooltipProvider>
      <Tooltip open={!shouldShowTooltip ? false : undefined}>
        <TooltipTrigger asChild>
          <span className={cn('whitespace-nowrap', className)}>
            <span className="font-bold inline-block line-height-inherit">
              {negative ? '-' : ''}
              {formattedPrice}
            </span>{' '}
            {symbol && (
              <span
                className={cn(
                  'font-semibold text-muted-foreground text-[0.8em] inline-block line-height-inherit',
                  symbolClassName,
                )}
              >
                {symbol}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span>
            {negative ? '-' : ''}
            {exactPrice} {symbol}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const PercentageCell = ({
  percentage,
  className,
  colorful,
}: {
  percentage: string;
  className?: string;
  colorful?: boolean;
}) => {
  const intl = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  });
  const isPositive = Number(percentage) >= 0;

  const formattedPercentage =
    Number(percentage) > 1000 ? '> 1000' : intl.format(Number(percentage));

  return (
    <span
      className={cn(
        'font-semibold whitespace-nowrap',
        colorful ? (isPositive ? 'text-green-500' : 'text-red-500') : '',
        className,
      )}
    >
      {formattedPercentage}%
    </span>
  );
};

export const UsdCell = ({
  number,
  className,
}: {
  number?: string;
  className?: string;
}) => {
  const intl = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
  });
  return (
    <span className={cn('font-semibold whitespace-nowrap', className)}>
      {number ? intl.format(Number(number)) : '--'}
    </span>
  );
};

export const NumberCell = ({
  number,
  className,
  compact = true,
  options,
}: {
  number: string;
  className?: string;
  compact?: boolean;
  options?: Intl.NumberFormatOptions;
}) => {
  const intl = new Intl.NumberFormat('en-US', {
    notation: compact ? 'compact' : 'standard',
    ...options,
  });
  return (
    <span className={cn('font-semibold whitespace-nowrap', className)}>
      {intl.format(Number(number))}
    </span>
  );
};

export const AddressCell = ({
  address,
  className,
  onClick,
}: {
  address?: string;
  className?: string;
  onClick?: () => void;
}) => {
  if (!address) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/users/${address}`}
            className={cn(className)}
            // prefetching user pages is costly for vercel
            // disable it temporarily
            prefetch={false}
            onClick={onClick}
          >
            {address?.slice(0, 6)}
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <span>{address}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const CollectionCell = ({
  collection,
  className,
  isLink = true,
  showLogo = true,
  showMintingTag = false,
  titleComponent: TitleComponent = 'span',
  titleClassName,
  onClick,
}: {
  collection?: Pick<
    LootexCollection,
    'slug' | 'logoImageUrl' | 'name' | 'isVerified'
  >;
  className?: string;
  isLink?: boolean;
  showLogo?: boolean;
  showMintingTag?: boolean;
  titleComponent?: keyof JSX.IntrinsicElements;
  titleClassName?: string;
  onClick?: () => void;
}) => {
  if (!collection) return null;

  const content = (
    <div
      className={cn(
        'flex font-semibold items-center gap-2 flex-nowrap max-w-[160px] md:max-w-none',
        className,
      )}
    >
      {showLogo && (
        <Image
          src={collection.logoImageUrl ?? ''}
          alt={collection.name}
          className="w-9 h-9 aspect-square rounded flex-shrink-0"
        />
      )}
      <div className="flex items-center gap-1 flex-1 truncate">
        <TitleComponent className={cn('truncate', titleClassName)}>
          {collection.name}
        </TitleComponent>
        {collection.isVerified && (
          <svg
            width="16"
            height="17"
            viewBox="0 0 16 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            <g clipPath="url(#clip0_14487_5375)">
              <g clipPath="url(#clip1_14487_5375)">
                <path
                  d="M6.78861 0.953611C7.52366 0.469564 8.4763 0.469564 9.21135 0.953611C9.60785 1.21472 10.0781 1.34072 10.552 1.31285C11.4306 1.26118 12.2556 1.7375 12.6502 2.52423C12.863 2.9486 13.2072 3.29285 13.6316 3.50568C14.4184 3.90023 14.8947 4.72523 14.843 5.60384C14.8151 6.07776 14.9411 6.54802 15.2022 6.94453C15.6863 7.67958 15.6863 8.63222 15.2022 9.36727C14.9411 9.76378 14.8151 10.234 14.843 10.708C14.8947 11.5866 14.4184 12.4116 13.6316 12.8061C13.2072 13.019 12.863 13.3632 12.6502 13.7876C12.2556 14.5743 11.4306 15.0506 10.552 14.9989C10.0781 14.9711 9.60785 15.0971 9.21135 15.3582C8.4763 15.8422 7.52366 15.8422 6.78861 15.3582C6.3921 15.0971 5.92185 14.9711 5.44792 14.9989C4.56932 15.0506 3.74431 14.5743 3.34976 13.7876C3.13693 13.3632 2.79268 13.019 2.36831 12.8061C1.58158 12.4116 1.10526 11.5866 1.15693 10.708C1.1848 10.234 1.0588 9.76377 0.797699 9.36728C0.313649 8.63222 0.313649 7.67958 0.797699 6.94453C1.0588 6.54802 1.1848 6.07776 1.15693 5.60384C1.10526 4.72523 1.58158 3.90023 2.36831 3.50568C2.79268 3.29285 3.13693 2.9486 3.34976 2.52423C3.74431 1.7375 4.56932 1.26118 5.44792 1.31285C5.92185 1.34072 6.3921 1.21472 6.78861 0.953611Z"
                  fill="#4A90E2"
                />
                <path
                  d="M7.06667 10.9727L11.7667 6.27269L10.8333 5.33936L7.06667 9.10602L5.16667 7.20602L4.23334 8.13936L7.06667 10.9727Z"
                  fill="#FAF9FA"
                />
                <path
                  d="M7.06667 10.9727L11.7667 6.27269L10.8333 5.33936L7.06667 9.10602L5.16667 7.20602L4.23334 8.13936L7.06667 10.9727Z"
                  fill="#FAF9FA"
                />
              </g>
            </g>
            <defs>
              <clipPath id="clip0_14487_5375">
                <rect
                  width="16"
                  height="16"
                  fill="white"
                  transform="translate(0 0.156006)"
                />
              </clipPath>
              <clipPath id="clip1_14487_5375">
                <rect
                  width="16"
                  height="16"
                  fill="white"
                  transform="translate(0 0.156006)"
                />
              </clipPath>
            </defs>
          </svg>
        )}
      </div>
    </div>
  );

  return isLink ? (
    <NextLink href={`/collections/${collection.slug}`} onClick={onClick}>
      {content}
    </NextLink>
  ) : (
    content
  );
};

export const ItemCell = ({
  imageUrl,
  title,
  subtitle,
  className,
  quantity,
  children,
  ...props
}: {
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  quantity?: number;
  children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        'flex items-center gap-2 flex-nowrap transition-all duration-200',
        props.onClick && 'cursor-pointer hover:opacity-90',
        className,
      )}
      {...props}
    >
      <Image
        src={imageUrl}
        alt={title ?? ''}
        className="w-9 h-9 aspect-square rounded flex-shrink-0"
      />
      <div className="flex flex-col gap-[2px] overflow-auto mr-auto">
        <div className="flex items-center gap-1 font-bold text-sm">
          {title ?? <span className="text-muted-foreground">{title}</span>}
          {quantity && (
            <Badge variant="secondary" className="px-[6px] py-[2px] text-xs">
              x{quantity}
            </Badge>
          )}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground truncate">
            {subtitle}
          </div>
        )}
      </div>
      {/* <div className="flex-1" /> */}
      {children}
    </div>
  );
};
