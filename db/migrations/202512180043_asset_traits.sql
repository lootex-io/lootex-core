-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS asset_traits
(
  id             uuid                                   NOT NULL PRIMARY KEY,
  asset_id       uuid                                   NOT NULL REFERENCES asset,
  collection_id  uuid                                   NOT NULL REFERENCES collections,
  trait_type     varchar,
  display_type   varchar,
  value          varchar,
  created_at     timestamp with time zone DEFAULT now() NOT NULL,
  updated_at     timestamp with time zone DEFAULT now() NOT NULL,
  deleted_at     timestamp with time zone,
  rarity_percent double precision,
  total_count    integer
);

CREATE INDEX IF NOT EXISTS asset_traits_asset_id_index
  ON asset_traits (asset_id);

CREATE INDEX IF NOT EXISTS asset_traits_collection_id_index
  ON asset_traits (collection_id);

CREATE INDEX IF NOT EXISTS asset_traits_collection_id_trait_type_value_index
  ON asset_traits (collection_id, trait_type, value);

CREATE INDEX IF NOT EXISTS asset_traits_value_trait_type_index
  ON asset_traits (value, trait_type);

CREATE INDEX IF NOT EXISTS idx_asset_traits_col_trait_display_covering
  ON asset_traits (collection_id, trait_type, display_type)
  INCLUDE (value, rarity_percent);

CREATE INDEX IF NOT EXISTS idx_asset_traits_collection_id
  ON asset_traits (collection_id);

CREATE INDEX IF NOT EXISTS idx_asset_traits_asset_id
  ON asset_traits (asset_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS asset_traits;

-- +goose StatementEnd