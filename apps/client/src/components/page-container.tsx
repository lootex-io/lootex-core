import { cn } from '@/lib/utils';

export const PageContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn('w-full px-4 md:px-6 py-2 md:py-3', className)}>
      {children}
    </div>
  );
};

export const PageHeader = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h1 className={cn('text-4xl font-brand mb-4', className)}>{children}</h1>
  );
};
