import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ItemCell, PriceCell } from './data-cells';

export const OrderDetails = ({
  items,
  isOpen,
}: {
  items?: {
    imageUrl?: string;
    price: string;
    symbol: string;
    tokenId?: string;
    name?: string;
    quantity?: number;
    title?: string;
    subtitle?: string;
    id?: string;
  }[];
  isOpen: boolean;
}) => {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={isOpen ? 'items' : undefined}
      className="overflow-auto"
    >
      <AccordionItem value="items">
        <AccordionTrigger className="pt-0">
          <div className="flex items-center gap-2">
            Items <Badge variant="outline">{items?.length ?? 0}</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
            {items?.length ? (
              items?.map((item) => (
                <ItemCell
                  key={item.id}
                  imageUrl={item.imageUrl}
                  title={item.title}
                  subtitle={item.subtitle}
                  quantity={item.quantity}
                >
                  <PriceCell exact price={item.price} symbol={item.symbol} />
                </ItemCell>
              ))
            ) : (
              <div className="text-sm text-gray-500">No items</div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
