import type { Asset, AssetTrait } from '@lootex-core/sdk/asset';
import Link from 'next/link';
import { AssetAccordion } from './accordion';

const isValidTrait = (trait: AssetTrait) => {
  return trait.trait_type && trait?.value !== 'undefined';
};

export const Attributes = ({ asset }: { asset?: Asset }) => {
  return (
    <AssetAccordion title="Attributes">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 items-stretch">
        {asset?.assetTraits?.filter(isValidTrait).length ? (
          asset?.assetTraits?.filter(isValidTrait).map((trait) => (
            <Link
              key={trait.trait_type}
              href={{
                pathname: `/collections/${asset?.collectionSlug}`,
                query: {
                  search: JSON.stringify({
                    traits: [
                      { traitType: trait.trait_type, value: trait.value },
                    ],
                  }),
                },
              }}
              onClick={() => {
                window.location.href = `/collections/${asset?.collectionSlug}?search=${JSON.stringify(
                  {
                    traits: [
                      { traitType: trait.trait_type, value: trait.value },
                    ],
                  },
                )}`;
              }}
            >
              <div className="flex flex-col rounded-lg bg-white border p-3 gap-1 capitalize h-full">
                <span className="text-sm text-muted-foreground">
                  {trait.trait_type}
                </span>
                <span className="text-base font-bold flex-1">
                  {trait.value}
                </span>
                <div className="flex justify-between items-end gap-1">
                  {trait.total_count && (
                    <span className="text-sm text-muted-foreground font-bold">
                      {trait.total_count}
                    </span>
                  )}
                  <span className="flex-1" />
                  {trait.rarity_percent && (
                    <span className="text-xs text-muted-foreground">
                      {trait.rarity_percent}%
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">
            No attributes found
          </span>
        )}
      </div>
    </AssetAccordion>
  );
};
