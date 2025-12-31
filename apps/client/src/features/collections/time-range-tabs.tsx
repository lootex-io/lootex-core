import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const TimeRangeTabs = ({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) => {
  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList>
        <TabsTrigger value="one_day">1d</TabsTrigger>
        <TabsTrigger value="one_week">7d</TabsTrigger>
        <TabsTrigger value="one_month">30d</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
