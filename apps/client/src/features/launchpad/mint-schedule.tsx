import { ConnectButton } from '@/components/connect-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient, lootex } from '@/lib/lootex';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import type { GetCollectionDropInfoResponse } from 'lootex/api/endpoints/collection';
import type { LootexCollection } from 'lootex/collection';
import { getDrop } from 'lootex/drop';
import { useEffect, useState } from 'react';
import { useConnection } from 'wagmi';
import { CalendarModal } from './calendar-modal';

export type DropWithStatus =
  GetCollectionDropInfoResponse['contract']['drops'][number] & {
    dropName?: string;
    phase: string;
    endTime?: string;
    isCurrent: boolean;
    isStarted: boolean;
    ended: boolean;
    isLive: boolean;
    isWhiteListOnly: boolean;
    eligible: boolean;
  };

export const Countdown = ({
  startTime,
  nextStartTime,
  renderWithBlocks = false,
  countdownType,
}: {
  startTime: string;
  nextStartTime?: string;
  renderWithBlocks?: boolean;
  countdownType?: string;
}) => {
  const [timeString, setTimeString] = useState<string>('');
  const [prefix, setPrefix] = useState<string>('');
  const [timeUnits, setTimeUnits] = useState<{ value: number; unit: string }[]>(
    [],
  );

  useEffect(() => {
    const updateTime = () => {
      const startDate = new Date(startTime);
      const nextStartDate = nextStartTime ? new Date(nextStartTime) : undefined;

      const isStarted = startDate.getTime() < Date.now();
      const isEnded = nextStartDate && nextStartDate.getTime() < Date.now();

      const targetDate =
        isStarted && nextStartDate && !isEnded ? nextStartDate : startDate;
      const prefix =
        countdownType ||
        (isStarted && nextStartDate && !isEnded
          ? 'Ends in'
          : isEnded
            ? 'Ended'
            : 'Starts in');

      setPrefix(prefix);

      if (isEnded) {
        setTimeString('Ended');
        setTimeUnits([]);
        return;
      }

      const now = Date.now();
      const diff = Math.abs(targetDate.getTime() - now);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const units = [
        { value: days, unit: 'd' },
        { value: hours, unit: 'h' },
        { value: minutes, unit: 'm' },
        { value: seconds, unit: 's' },
      ];

      setTimeUnits(units);
      setTimeString(
        `${prefix} ${units
          .map(({ value, unit }) => `${value}${unit}`)
          .join(' ')}`,
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [startTime, nextStartTime, countdownType]);

  if (renderWithBlocks && timeUnits.length > 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-foreground font-bold text-sm md:text-base">
          {prefix}
        </span>
        <div className="flex gap-2">
          {timeUnits.map(({ value, unit }, index) => (
            <div
              key={unit}
              className="flex items-center justify-center bg-muted rounded-[12px] p-2 gap-1"
            >
              <span className="font-brand">{value}</span>
              <span className="text-muted-foreground font-bold">{unit}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <span className="text-muted-foreground font-bold">{timeString}</span>;
};

export const MintSchedule = ({
  drop: dropInfo,
  collection,
  overrideFinalPhaseText,
}: {
  drop?: GetCollectionDropInfoResponse;
  collection?: LootexCollection;
  overrideFinalPhaseText?: string;
}) => {
  const { address } = useConnection();
  const account = address ? { address } : undefined;
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const dropQuery = useQuery({
    queryKey: ['drop', { contractAddress: collection?.contractAddress }],
    queryFn: () => {
      return getDrop({
        client: lootex,
        chainId: Number(collection?.chainId),
        contractAddress: collection?.contractAddress as `0x${string}`,
        collectionSlug: collection?.slug as string,
        dropInfo,
      });
    },
    enabled: !!collection?.contractAddress,
  });

  const { data: dropsWithEligibility, isSuccess } = useQuery({
    queryKey: [
      'drops-with-eligibility',
      {
        contractAddress: collection?.contractAddress,
        walletAddress: account?.address,
      },
    ],
    queryFn: async () => {
      if (!dropInfo?.contract.drops) return [];

      const currentConditionId = Number(
        dropQuery.data?.conditions.currentConditionId,
      );
      const isStarted = !!dropQuery.data?.conditions.isStarted;
      const isSoldOut = !!dropQuery.data?.conditions.isSoldOut;
      const isEnded = !!dropQuery.data?.conditions.isEnded;

      const baseDrops = dropInfo.contract.drops.map((drop, index) => {
        const isCurrent = index === currentConditionId;
        const ended = isCurrent && (isSoldOut || isEnded);
        const isLive = isCurrent && isStarted && !ended;
        const isWhiteListOnly = !!(
          (drop?.limitPerWallet === '0' || drop?.limitPerWallet === '') &&
          drop?.allowlist
        );
        const phase = isWhiteListOnly
          ? 'Whitelist Only'
          : overrideFinalPhaseText || `Phase ${index + 1}`;

        return {
          ...drop,
          dropName: dropInfo?.contract?.dropName || collection?.name,
          phase,
          endTime:
            index === (dropInfo?.contract?.drops?.length ?? 0 - 1)
              ? undefined
              : dropInfo?.contract?.drops?.[index + 1]?.startTime,
          isCurrent,
          isStarted,
          ended,
          isLive,
          isWhiteListOnly,
        };
      });

      // Not Connected, consider everyone is not eligible
      if (!account) {
        return baseDrops.map((drop) => ({ ...drop, eligible: false }));
      }

      // Connected, determine eligibility
      const results = await Promise.all(
        baseDrops.map(async (drop) => {
          // Public drop, everyone is eligible
          if (!drop.allowlist || !drop.isWhiteListOnly) {
            return { ...drop, eligible: true };
          }

          try {
            const { isWhitelisted } = await apiClient.studio.getWhitelistProof({
              contractId: dropInfo?.contract?.id,
              dropId: drop.id,
              walletAddress: account?.address as `0x${string}`,
            });
            return { ...drop, eligible: isWhitelisted };
          } catch (err) {
            console.error(
              `Error checking eligibility for drop: ${drop.id}`,
              err,
            );
            return { ...drop, eligible: false };
          }
        }),
      );

      return results;
    },
    enabled: !!collection?.contractAddress && !!dropQuery.data,
  });

  const enableAddToCalendar =
    !!dropQuery.data && !dropQuery.data?.conditions?.isStarted;

  return (
    <div className="flex flex-col gap-3 p-4 md:p-6 rounded-lg bg-white">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <h3 className="text-foreground font-brand text-xl font-bold">
          Mint Schedule
        </h3>
        <div className="flex items-center gap-2">
          {enableAddToCalendar && dropsWithEligibility && (
            <>
              <Button
                variant="secondary"
                onClick={() => setIsCalendarOpen(true)}
              >
                Add to Calendar
              </Button>
              <CalendarModal
                isOpen={isCalendarOpen}
                setIsOpen={setIsCalendarOpen}
                collection={collection}
                drops={dropsWithEligibility}
              />
            </>
          )}
          {!account && (
            <ConnectButton
              buttonText="View Eligibility"
              connectButtonStyle={{
                fontFamily: 'var(--font-lato)',
                fontSize: '14px',
                fontWeight: 'bold',
                paddingBlock: '0.5rem',
                paddingInline: '1rem',
                height: '2.25rem',
              }}
            />
          )}
        </div>
      </div>
      {!dropQuery.isSuccess || !isSuccess ? (
        <div className="flex gap-2 items-center justify-between">
          <Skeleton className="w-16 h-8" />
          <Skeleton className="w-24 h-8" />
        </div>
      ) : (
        <div className="flex flex-col gap-3 md:gap-2">
          {dropsWithEligibility?.map((drop, index) => {
            return (
              <div
                className="flex flex-row items-center justify-between flex-wrap gap-1"
                key={drop.id}
              >
                <span
                  className={cn(
                    'flex items-center gap-1 text-muted-foreground',
                  )}
                >
                  {drop.phase}
                  {drop.isLive && <Badge variant="success">Live</Badge>}
                </span>
                <div className="flex items-center gap-2">
                  {(drop.ended && 'Ended') ||
                    (index === (dropInfo?.contract.drops?.length ?? 0) - 1 &&
                      drop.isStarted && (
                        <span className="text-muted-foreground font-bold">
                          while stocks last
                        </span>
                      )) || (
                      <Countdown
                        renderWithBlocks={drop.isLive}
                        startTime={drop.startTime}
                        nextStartTime={
                          dropInfo?.contract.drops[index + 1]?.startTime
                        }
                      />
                    )}
                  {account && (
                    <Badge
                      variant={drop.eligible ? 'success' : 'secondary'}
                      className="capitalize"
                    >
                      {drop.eligible ? 'eligible' : 'not eligible'}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
