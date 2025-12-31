'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { Info } from 'lucide-react';

const IconPopover = ({
  icon = <Info className="w-4 h-4" />,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <Popover>
      <PopoverTrigger className="p-1 h-auto rounded-sm transition-colors hover:bg-accent hover:text-accent-foreground">
        {icon}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-auto max-w-72 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground border-none"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
};

export default IconPopover;
