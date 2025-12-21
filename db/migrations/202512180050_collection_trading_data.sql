-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS collection_trading_data
(
  id               uuid                                   NOT NULL PRIMARY KEY,
  contract_address varchar                                NOT NULL,
  chain_id         integer                                NOT NULL,
  trading_volume   numeric,
  trading_count    integer,
  floor_price      numeric,
  time             timestamp with time zone               NOT NULL,
  created_at       timestamp with time zone DEFAULT now() NOT NULL,
  updated_at       timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS collection_trading_data_chain_id_contract_address_index
  ON collection_trading_data (chain_id, contract_address);

CREATE INDEX IF NOT EXISTS collection_trading_data_floor_price_index
  ON collection_trading_data (floor_price);

CREATE INDEX IF NOT EXISTS collection_trading_data_time_index
  ON collection_trading_data (time);

CREATE INDEX IF NOT EXISTS collection_trading_data_trading_count_index
  ON collection_trading_data (trading_count);

CREATE INDEX IF NOT EXISTS collection_trading_data_trading_volume_index
  ON collection_trading_data (trading_volume);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS collection_trading_data;

-- +goose StatementEnd