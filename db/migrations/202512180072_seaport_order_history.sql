-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS seaport_order_history
(
  id                    uuid                                   NOT NULL,
  contract_address      bytea                                  NOT NULL,
  token_id              varchar,
  amount                varchar,
  chain_id              integer                                NOT NULL,
  category              asset_event_history_category           NOT NULL,
  start_time            timestamp with time zone               NOT NULL,
  end_time              timestamp with time zone,
  price                 real,
  currency_symbol       varchar,
  usd_price             real,
  from_address          bytea                                  NOT NULL,
  to_address            bytea,
  hash                  bytea,
  tx_hash               bytea,
  created_at            timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at            timestamp with time zone,
  updated_at            timestamp with time zone DEFAULT now() NOT NULL,
  order_status          order_status_type DEFAULT 'Init'::order_status_type,
  platform_type         integer          DEFAULT 0            NOT NULL,
  ip                    varchar,
  area                  varchar,
  block_height          varchar,
  exchange_address      bytea,
  service_fee_amount    varchar,
  service_fee_usd_price real,
  sdk_api_key_id        varchar
);

CREATE UNIQUE INDEX IF NOT EXISTS seaport_order_history_id_uindex
  ON seaport_order_history (id);

CREATE INDEX IF NOT EXISTS seaport_order_history_contract_address_index
  ON seaport_order_history (contract_address);

CREATE INDEX IF NOT EXISTS seaport_order_history_category_index
  ON seaport_order_history (category);

CREATE INDEX IF NOT EXISTS seaport_order_history_from_address_index
  ON seaport_order_history (from_address);

CREATE INDEX IF NOT EXISTS seaport_order_history_to_address_index
  ON seaport_order_history (to_address);

CREATE INDEX IF NOT EXISTS seaport_order_history_platform_type_index
  ON seaport_order_history (platform_type);

CREATE INDEX IF NOT EXISTS seaport_order_history_tx_hash_index
  ON seaport_order_history (tx_hash);

CREATE INDEX IF NOT EXISTS seaport_order_history_hash_index
  ON seaport_order_history (hash);

CREATE UNIQUE INDEX IF NOT EXISTS seaport_order_history_unique_history_uindex
  ON seaport_order_history (tx_hash, hash, chain_id, category, token_id);

CREATE INDEX IF NOT EXISTS seaport_order_history_start_time_index
  ON seaport_order_history (start_time);

CREATE INDEX IF NOT EXISTS seaport_order_history_created_at_index
  ON seaport_order_history (created_at DESC);

CREATE INDEX IF NOT EXISTS seaport_order_history_mv_idx
  ON seaport_order_history (created_at DESC, category ASC, currency_symbol ASC, chain_id ASC, contract_address ASC);

CREATE INDEX IF NOT EXISTS idx_seaport_order_history_created_at_desc
  ON seaport_order_history (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seaport_order_history_from_address_created
  ON seaport_order_history (from_address ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seaport_order_history_to_address_created
  ON seaport_order_history (to_address ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seaport_order_history_contract_token_created
  ON seaport_order_history (contract_address ASC, token_id ASC, chain_id ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seaport_order_history_chain_created
  ON seaport_order_history (chain_id ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seaport_order_history_category_created
  ON seaport_order_history (category ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seaport_order_history_platform_created
  ON seaport_order_history (platform_type ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seaport_order_history_contract_chain_created
  ON seaport_order_history (contract_address ASC, chain_id ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS seaport_order_history_contract_address_encoded_chain_index
  ON seaport_order_history (encode(contract_address, 'escape'), chain_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS seaport_order_history;

-- +goose StatementEnd