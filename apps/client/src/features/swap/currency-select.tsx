import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { tokens } from '@/lib/tokens';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CurrencySelectProps {
  value?: string;
  onChange: (value: string) => void;
  excludeToken?: string;
}

export const CurrencySelect = ({
  value,
  onChange,
  excludeToken,
}: CurrencySelectProps) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('w-[180px] font-bold')}>
        <SelectValue placeholder="Select token" />
      </SelectTrigger>
      <SelectContent>
        {tokens.map((token) => (
          <SelectItem
            key={token.symbol}
            value={token.symbol}
            disabled={token.symbol === excludeToken}
          >
            <div className="flex items-center gap-2 font-bold text-muted-foreground">
              <Image src={token.icon} alt={token.name} width={20} height={20} />
              {token.symbol}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
