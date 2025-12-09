import { defaultChain } from '@/lib/wagmi';
import { cn } from '@/lib/utils';
import { ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';

export const ViewTransactionLink = ({
  txHash,
  children,
  className,
}: {
  txHash?: string | null;
  children?: React.ReactNode;
  className?: string;
}) => {
  const chain = defaultChain;
  const url = chain.blockExplorers?.default?.url;

  if (!url || !txHash) return null;

  return (
    <Link
      href={`${url}/tx/${txHash}`}
      target="_blank"
      className={cn(
        'flex items-center gap-2 whitespace-nowrap hover:underline',
        className,
      )}
    >
      {children ?? 'View Transaction'}
      <ExternalLinkIcon className="w-4 h-4" />
    </Link>
  );
};
