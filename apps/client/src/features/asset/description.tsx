import type { Asset } from 'lootex/asset';
import { AssetAccordion } from './accordion';

export const Description = ({
  asset,
  className,
}: {
  asset?: Asset;
  className?: string;
}) => {
  return (
    <AssetAccordion title="Description" className={className}>
      <p className="text-muted-foreground">
        {asset?.assetDescription || 'No description available'}
      </p>
    </AssetAccordion>
  );
};
