import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { apiClient } from '@/lib/lootex';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import type { LootexCollection } from 'lootex/collection';
import { PackageOpen } from 'lucide-react';
import { useState } from 'react';
import { useConnection } from 'wagmi';

export type BlindboxAsset = {
  imageUrl: string;
  tokenId: string;
  traits: { trait_type: string; value: string; display_type: string }[];
  name: string;
  description: string;
  chainId: number;
  collectionName: string;
  collectionSlug: string;
  collectionContractAddress: string;
  collectionChainShortName: string;
};

const UtilityBar = ({
  collection,
}: {
  collection: LootexCollection & {
    isRevealable: boolean;
    canRevealAt: string;
    revealUrl: string;
    isStakeable: boolean;
    stakeUrl: string;
  };
}) => {
  const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);

  const { address } = useConnection();
  const account = address ? { address } : undefined;

  const authGuard = useAuthGuard();

  const isStaking = collection.isStakeable;
  const isBlindbox = collection.isRevealable;
  const revealTime = new Date(collection.canRevealAt);
  const isStartReveal = new Date() >= revealTime;

  const {
    data: { assets } = {},
    isLoading,
  } = useQuery<{
    assets: BlindboxAsset[];
  }>({
    queryKey: [
      'blindbox-assets',
      { slug: collection?.slug, accountAddress: account?.address },
    ],
    queryFn: () =>
      apiClient.request({
        path: '/v3/studio/contracts/blindbox',
        method: 'GET',
        query: {
          chainId: collection?.chainId,
          contractAddress: collection?.contractAddress,
          walletAddress: account?.address,
          limit: 20,
        },
      }),
    enabled: !!account?.address && !!collection,
  });

  const canReveal = !!account?.address && !!assets && assets?.length > 0;

  return (
    <>
      {isStaking || isBlindbox ? (
        <div className="flex items-center gap-2 border-2 border-[#FFC64A] bg-white rounded-3xl px-3 py-2">
          {isBlindbox && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  className={cn(
                    (!isStartReveal || !canReveal) && 'cursor-not-allowed',
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center gap-1 cursor-pointer',
                      (!isStartReveal || !canReveal) &&
                        'pointer-events-none opacity-50',
                    )}
                    onClick={() => {
                      authGuard(() => {
                        setIsRevealModalOpen(true);
                      });
                    }}
                  >
                    <PackageOpen className="w-4 h-4 shrink-0" />
                    <p className="text-sm font-bold text-left">
                      Reveal BlindBox{' '}
                      {!isStartReveal && (
                        <span className="text-xs font-normal">{`on ${
                          revealTime.getUTCMonth() + 1
                        }/${revealTime.getUTCDate()}`}</span>
                      )}
                    </p>
                  </div>
                </TooltipTrigger>
                {!canReveal && (
                  <TooltipContent>
                    You don’t own any blindbox in this collection
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      ) : null}
    </>
  );
};

export default UtilityBar;
