import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export const AssetAccordion = ({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <Accordion
      type="single"
      collapsible
      className={cn('bg-white rounded-lg px-4', className)}
      defaultValue={title}
    >
      <AccordionItem className="border-b-0" value={title}>
        <AccordionTrigger className="text-lg font-brand">
          {title}
        </AccordionTrigger>
        <AccordionContent>{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
