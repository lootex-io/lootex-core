-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS asset_as_eth_account
(
  id            uuid                     DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
  asset_id      uuid                                                NOT NULL REFERENCES asset,
  quantity      varchar                  DEFAULT 1                  NOT NULL,
  created_at    timestamp with time zone DEFAULT now(),
  deleted_at    timestamp with time zone,
  updated_at    timestamp with time zone DEFAULT now(),
  owner_address text                                                NOT NULL,
  contract_id   uuid,

  -- 你原本 DDL 內有 unique(asset_id, eth_account_id) 但欄位缺失，先移除避免失敗
  UNIQUE (asset_id, owner_address)
);

CREATE INDEX IF NOT EXISTS owner_address_search
  ON asset_as_eth_account (owner_address);

CREATE INDEX IF NOT EXISTS idx_asset_as_eth_account_ultra_fast
  ON asset_as_eth_account (asset_id, owner_address, quantity)
  WHERE ((quantity)::numeric > (0)::numeric);

CREATE INDEX IF NOT EXISTS asset_as_eth_account_owner_address_lower_idx
  ON asset_as_eth_account (lower(owner_address), asset_id);

CREATE INDEX IF NOT EXISTS idx_asset_eth_account_asset_quantity
  ON asset_as_eth_account (asset_id, quantity)
  WHERE ((quantity)::text <> '0'::text);

CREATE INDEX IF NOT EXISTS idx_asset_eth_account_asset_id
  ON asset_as_eth_account (asset_id);

CREATE INDEX IF NOT EXISTS idx_asset_as_eth_account_asset_owner
  ON asset_as_eth_account (asset_id, owner_address)
  WHERE ((quantity)::text <> '0'::text);

CREATE INDEX IF NOT EXISTS idx_asset_as_eth_account_quantity
  ON asset_as_eth_account (asset_id, quantity)
  WHERE ((quantity)::text <> '0'::text);

CREATE INDEX IF NOT EXISTS idx_asset_as_eth_account_contract_quantity
  ON asset_as_eth_account (contract_id, quantity);

CREATE INDEX IF NOT EXISTS idx_asset_as_eth_account_owner_addr_qty_neq_0
  ON asset_as_eth_account (owner_address)
  WHERE ((quantity)::text <> '0'::text);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS asset_as_eth_account;

-- +goose StatementEnd