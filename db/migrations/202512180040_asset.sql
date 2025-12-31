-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS asset
(
  id                uuid                     DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
  token_id          varchar                                             NOT NULL,
  name              varchar,
  description       varchar,
  image_url         varchar,
  external_url      varchar,
  background_color  varchar,
  traits            jsonb,
  contract_id       uuid REFERENCES contract,
  created_at        timestamp with time zone DEFAULT now(),
  deleted_at        timestamp with time zone,
  updated_at        timestamp with time zone DEFAULT now(),
  animation_url     varchar,
  google_image_url  varchar,
  last_updated_at   timestamp with time zone DEFAULT now(),
  image_preview_url varchar,
  animation_type    varchar,
  x_traits          jsonb                    DEFAULT '[]'::jsonb        NOT NULL,
  chain_id          integer,
  token_uri         varchar,
  total_owners      integer                  DEFAULT 1,
  total_amount      numeric(78)              DEFAULT 1,
  image_data        bytea,
  CONSTRAINT contract_token_id_unique UNIQUE (token_id, contract_id)
);

CREATE INDEX IF NOT EXISTS asset_contract_id_index
  ON asset (contract_id);

CREATE INDEX IF NOT EXISTS asset_chain_id_index
  ON asset (chain_id);

CREATE INDEX IF NOT EXISTS asset_updated_at_desc_index
  ON asset (updated_at DESC);

CREATE INDEX IF NOT EXISTS asset_created_at_desc_index
  ON asset (created_at DESC);

CREATE INDEX IF NOT EXISTS asset_contract_index
  ON asset (contract_id);

CREATE INDEX IF NOT EXISTS idx_asset_ultra_fast
  ON asset (contract_id, id)
  WHERE (id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_asset_traits_gin
  ON asset USING gin (traits);

CREATE INDEX IF NOT EXISTS idx_asset_contract_id
  ON asset (contract_id) INCLUDE (id);

CREATE INDEX IF NOT EXISTS idx_asset_name_trgm_gin
  ON asset USING gin (lower(name::text) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_asset_lower_name_prefix
  ON asset (lower(name::text) text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_asset_contract_token_id
  ON asset (contract_id, token_id);

CREATE INDEX IF NOT EXISTS asset_name_lower_gin_index
  ON asset USING gin (lower(name::text) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS asset_traits_gin_idx
  ON asset USING gin ((traits -> 'trait_type'), (traits -> 'value'));

CREATE INDEX IF NOT EXISTS asset_traits_gin_idx_2
  ON asset USING gin ((traits -> 'displayType'), (traits -> 'value'));

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS asset;

-- +goose StatementEnd