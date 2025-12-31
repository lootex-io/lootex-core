import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { forwardRef, useEffect, useState } from 'react';

export const CopyButton = forwardRef<
  HTMLButtonElement,
  {
    value: string;
    iconClassName?: string;
  } & ButtonProps
>(({ value, children, className, iconClassName, ...props }, ref) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isCopied) {
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    }
  }, [isCopied]);

  return (
    <Button
      ref={ref}
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value);
        setIsCopied(true);
      }}
      className={cn(isCopied && 'animate-pulse', className)}
      {...props}
    >
      {children}
      {isCopied ? (
        <CheckIcon className={cn('w-4 h-4', iconClassName)} />
      ) : (
        <CopyIcon className={cn('w-4 h-4', iconClassName)} />
      )}
    </Button>
  );
});

CopyButton.displayName = 'CopyButton';
