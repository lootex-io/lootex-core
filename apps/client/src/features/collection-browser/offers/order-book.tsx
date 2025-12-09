import { PriceCell } from '@/components/data-cells';
import { DataTable } from '@/components/data-table';
import type { LootexOrder } from 'lootex/order';
import { useMemo } from 'react';

export const OrderBook = ({ orders }: { orders: LootexOrder[] }) => {
  const aggregatedOrders = useMemo(() => {
    return Object.entries(
      orders.reduce(
        (acc, order) => {
          const availableAmount = Number(
            order.seaportOrder.parameters.consideration[0].availableAmount,
          );
          const price = order.perPrice;
          const symbol = order.priceSymbol;

          const key = `${price}-${symbol}`;
          const currentEntry = acc[key] ?? {
            price,
            symbol,
            quantity: 0,
            usersCount: 0,
          };

          acc[key] = {
            price,
            symbol,
            quantity: currentEntry.quantity + availableAmount,
            usersCount: currentEntry.usersCount + 1,
          };

          return acc;
        },
        {} as Record<
          string,
          {
            price: number;
            symbol: string;
            quantity: number;
            usersCount: number;
          }
        >,
      ),
    ).map(([_, { price, symbol, quantity, usersCount }]) => ({
      price,
      symbol,
      quantity,
      usersCount,
      totalValue: quantity * price,
    }));
  }, [orders]);

  const maxQuantity = useMemo(() => {
    return Math.max(...aggregatedOrders.map((order) => order.quantity));
  }, [aggregatedOrders]);

  return (
    <div>
      <DataTable
        columns={[
          {
            header: 'Offer Price',
            cell: ({ row }) => (
              <div className="relative w-full h-9 flex items-center pl-1 my-[-2px]">
                <div
                  className="absolute inset-0 bg-brand/20 "
                  style={{
                    width: `${(row.original.quantity / maxQuantity) * 100}%`,
                  }}
                />
                <div className="relative">
                  <PriceCell
                    price={row.original.price.toString()}
                    symbol={row.original.symbol}
                    exact
                  />
                </div>
              </div>
            ),
          },
          {
            header: 'Quantity',
            cell: ({ row }) => row.original.quantity,
          },
          {
            header: 'Total Volume',
            cell: ({ row }) => (
              <PriceCell
                price={row.original.totalValue.toString()}
                symbol={row.original.symbol}
                exact
              />
            ),
          },
          {
            header: 'Users',
            cell: ({ row }) => row.original.usersCount,
          },
        ]}
        data={aggregatedOrders}
        className="flex-1 min-h-0"
        isLoading={false}
        skeletonRows={10}
      />
    </div>
  );
};
