import { useModal } from '@/components/modal-manager';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { cn } from '@/lib/utils';

export const SwapButton = ({
  fromToken,
  toToken,
  className,
  children = 'Swap',
  ...restProps
}: {
  fromToken?: string;
  toToken?: string;
} & ButtonProps) => {
  const { onOpen: onOpenSwapModal } = useModal('swap');
  const authGuard = useAuthGuard();

  return (
    <Button
      variant="secondary"
      onClick={(e) => {
        e.stopPropagation();
        authGuard(() => {
          onOpenSwapModal({ fromToken, toToken });
        });
      }}
      className={cn(className)}
      {...restProps}
    >
      {children}
    </Button>
  );
};
