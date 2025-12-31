import { getBlockExplorerUrl } from '@/utils/block-explorer';
import type { Asset } from '@lootex-core/sdk/asset';
import { formatAddress } from '@lootex-core/sdk/utils';
import { ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';
import { AssetAccordion } from './accordion';

export const Details = ({
  asset,
  className,
}: {
  asset?: Asset;
  className?: string;
}) => {
  return (
    <AssetAccordion title="Details" className={className}>
      <div className="flex flex-col gap-2">
        {asset?.collectionChainShortName && asset?.contractAddress && (
          <div className="text-muted-foreground flex justify-between">
            <span>Contract Address</span>
            <Link
              href={getBlockExplorerUrl(
                asset?.collectionChainShortName,
                asset?.contractAddress,
              )}
              target="_blank"
              className="font-bold inline-flex items-center gap-1"
            >
              {formatAddress(asset?.contractAddress)}{' '}
              <ExternalLinkIcon className="w-4 h-4" />
            </Link>
          </div>
        )}
        <div className="text-muted-foreground flex justify-between">
          <span>Token ID</span>
          <span className="font-bold">{asset?.assetTokenId}</span>
        </div>
        <div className="text-muted-foreground flex justify-between">
          <span>Token Standard</span>
          <span className="font-bold">{asset?.contractType}</span>
        </div>
        {asset?.collectionOwnerAddress && (
          <div className="text-muted-foreground flex justify-between">
            <span>Creator</span>
            <Link
              href={getBlockExplorerUrl(
                asset?.collectionChainShortName,
                asset?.collectionOwnerAddress,
              )}
              target="_blank"
              className="font-bold inline-flex items-center gap-1"
            >
              {formatAddress(asset?.collectionOwnerAddress)}
              <ExternalLinkIcon className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </AssetAccordion>
  );
};
