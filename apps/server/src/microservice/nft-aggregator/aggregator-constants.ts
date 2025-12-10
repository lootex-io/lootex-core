export const AGGREGATOR_WEBSOCKET_PING_INTERVAL = 30000;
export const AGGREGATOR_WEBSOCKET_PONG_TIMEOUT = 5000;
export const AGGREGATOR_WEBSOCKET_RECONNECT_DELAY = 1000;

export enum OPENSEA_EVENT_TYPE {
  ITEM_LISTED = 'item_listed',
  ITEM_SOLD = 'item_sold',
  ITEM_TRANSFERRED = 'item_transferred',
  ITEM_CANCELLED = 'item_cancelled',
}

export const OPENSEA_COLLECTIONS_BLACKLIST = [
  'trump-digital-trading-cards-series-2',
];

export enum ORDER_PLATFORM_TYPE {
  DEFAULT = 0, // Lootex
  OPENSEA = 1,
}

// Seaport 1.6 合約地址
export const SEAPORT_EXCHANGE_ADDRESS_16 =
  '0x0000000000000068f116a894984e2db1123eb395';

// Seaport 1.5 合約地址
export const SEAPORT_EXCHANGE_ADDRESS_15 =
  '0x00000000000000adc04c56bf30ac9d3c0aaf14dc';
