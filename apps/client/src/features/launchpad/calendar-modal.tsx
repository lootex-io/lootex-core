import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

import { DropWithStatus } from './mint-schedule';
import { useState } from 'react';
import { LootexCollection } from 'lootex/collection';

export type CalendarEventParams = {
  title: string;
  details?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  isAllDay?: boolean;
  platform: 'google' | 'apple';
};

const GoogleIcon = () => (
  <svg
    role="img"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Google</title>
    <path
      d="M3.26401 7.55797C4.09602 5.90122 5.37238 4.50849 6.95044 3.53544C8.5285 2.5624 10.3461 2.04739 12.2 2.04797C14.895 2.04797 17.159 3.03797 18.89 4.65297L16.023 7.52097C14.986 6.52997 13.668 6.02497 12.2 6.02497C9.595 6.02497 7.39001 7.78498 6.60501 10.148C6.40501 10.748 6.29101 11.388 6.29101 12.048C6.29101 12.708 6.40501 13.348 6.60501 13.948C7.39101 16.312 9.595 18.071 12.2 18.071C13.545 18.071 14.69 17.716 15.586 17.116C16.1054 16.774 16.5501 16.3302 16.8932 15.8115C17.2363 15.2927 17.4706 14.7098 17.582 14.098H12.2V10.23H21.618C21.736 10.884 21.8 11.566 21.8 12.275C21.8 15.321 20.71 17.885 18.818 19.625C17.164 21.153 14.9 22.048 12.2 22.048C10.8866 22.0485 9.58604 21.7902 8.37255 21.2878C7.15906 20.7855 6.05646 20.0489 5.12777 19.1202C4.19908 18.1915 3.46251 17.0889 2.96015 15.8754C2.45779 14.6619 2.19949 13.3613 2.20001 12.048C2.20001 10.434 2.58601 8.90797 3.26401 7.55797Z"
      fill="#2B2B2B"
    />
  </svg>
);
const AppleIcon = () => (
  <svg
    role="img"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <title>Apple</title>
    <path
      d="M17.6483 12.5689C17.6394 10.9302 18.3806 9.69336 19.8809 8.78248C19.0415 7.58137 17.7734 6.92054 16.099 6.79105C14.5138 6.66603 12.7814 7.71533 12.1473 7.71533C11.4776 7.71533 9.94158 6.8357 8.73601 6.8357C6.24448 6.87589 3.59668 8.82267 3.59668 12.7832C3.59668 13.9531 3.811 15.1616 4.23965 16.4089C4.81119 18.0476 6.87406 22.0662 9.02624 21.9992C10.1514 21.9724 10.9462 21.1999 12.4108 21.1999C13.8307 21.1999 14.5674 21.9992 15.8221 21.9992C17.9922 21.9679 19.8586 18.3155 20.4033 16.6723C17.4921 15.3015 17.6483 12.6537 17.6483 12.5689ZM15.1211 5.2372C16.3401 3.7905 16.2284 2.4733 16.1927 2C15.1166 2.06251 13.8709 2.73228 13.1609 3.55832C12.3795 4.44241 11.9196 5.53636 12.0179 6.76872C13.1832 6.85803 14.2459 6.2597 15.1211 5.2372Z"
      fill="#2B2B2B"
    />
  </svg>
);

const platforms: { type: 'google' | 'apple'; Icon: React.FC }[] = [
  {
    type: 'google',
    Icon: GoogleIcon,
  },
  {
    type: 'apple',
    Icon: AppleIcon,
  },
];

const addToCalendar = ({
  platform,
  title,
  details = '',
  startTime,
  endTime,
  location = '',
  isAllDay = false,
}: CalendarEventParams) => {
  const start = new Date(startTime);
  const end = endTime
    ? new Date(endTime)
    : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (platform === 'google') {
    const formatGoogleDate = (date: Date) =>
      date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const url = `https://calendar.google.com/calendar/u/0/r/eventedit?dates=${formatGoogleDate(
      start,
    )}/${formatGoogleDate(end)}&text=${encodeURIComponent(
      title,
    )}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(
      location,
    )}&allday=${isAllDay}`;

    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  } else if (platform === 'apple') {
    const formatICSDate = (date: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
        date.getUTCDate(),
      )}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
    };

    const uid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `${crypto.randomUUID()}@biru.gg`
        : `${Date.now()}@biru.gg`;
    const dtStamp = formatICSDate(new Date());
    const dtStart = formatICSDate(start);
    const dtEnd = formatICSDate(end);
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:biru.gg',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details}`,
      `LOCATION:${location}`,
      'CLASS:PUBLIC',
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export const CalendarModal = ({
  isOpen,
  setIsOpen,
  collection,
  drops,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  collection?: LootexCollection;
  drops?: DropWithStatus[];
}) => {
  const [selectedDropId, setSelectedDropId] = useState<string | undefined>(
    drops?.[0]?.id ?? undefined,
  );
  const selectedDrop = drops?.find((drop) => drop.id === selectedDropId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-bold font-brand">
            Add a reminder to calendar
          </DialogTitle>
        </DialogHeader>
        <RadioGroup
          value={selectedDropId}
          onValueChange={(value) => setSelectedDropId(value)}
          className="gap-4"
        >
          {drops?.map((drop) => {
            return (
              <div key={drop?.id} className="flex items-center gap-2">
                <RadioGroupItem value={drop?.id} id={drop?.id} />
                <Label htmlFor={drop?.id}>
                  <div className="flex flex-col gap-1">
                    <p className="font-bold">{drop?.phase}</p>
                    <p className="text-xs">
                      {new Intl.DateTimeFormat('en-US', {
                        year: 'numeric',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                        timeZoneName: 'short',
                      }).format(new Date(drop?.startTime))}
                    </p>
                  </div>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        <Separator />
        <div className="flex flex-col gap-2">
          {platforms.map(({ type, Icon }) => {
            return (
              <div
                key={type}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Icon />
                  <p className="capitalize">{`${type} Calendar`}</p>
                </div>
                <Button
                  onClick={() => {
                    if (selectedDrop) {
                      const origin =
                        process.env.NEXT_PUBLIC_DEPLOY_ORIGIN?.replace(
                          /\/+$/,
                          '',
                        );
                      addToCalendar({
                        platform: type,
                        title: `Mint ${selectedDrop?.dropName} ${selectedDrop?.phase}`,
                        details: `Mint now at ${origin}/launchpad/${collection?.slug}`,
                        startTime: selectedDrop.startTime,
                        endTime: selectedDrop?.endTime,
                      });
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
