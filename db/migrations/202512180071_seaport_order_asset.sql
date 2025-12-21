-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS seaport_order_asset
(
  id                     uuid    NOT NULL,
  seaport_order_id       uuid    NOT NULL,
  side                   integer NOT NULL,
  item_type              integer NOT NULL,
  asset_id               uuid,
  currency_id            uuid,
  token                  bytea   NOT NULL,
  identifier_or_criteria bytea   NOT NULL,
  start_amount           bytea   NOT NULL,
  end_amount             bytea   NOT NULL,
  recipient              bytea,
  created_at             timestamp with time zone DEFAULT now(),
  deleted_at             timestamp with time zone,
  updated_at             timestamp with time zone DEFAULT now(),
  available_amount       bytea,
  is_fillable            boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS seaport_order_asset_new_asset_id_idx
  ON seaport_order_asset (asset_id);

CREATE UNIQUE INDEX IF NOT EXISTS seaport_order_asset_new_id_idx
  ON seaport_order_asset (id);

CREATE INDEX IF NOT EXISTS seaport_order_asset_new_seaport_order_id_asset_id_idx
  ON seaport_order_asset (seaport_order_id, asset_id);

CREATE INDEX IF NOT EXISTS seaport_order_asset_new_token_identifier_or_criteria_idx
  ON seaport_order_asset (token, identifier_or_criteria);

CREATE INDEX IF NOT EXISTS seaport_order_asset_new_token_idx
  ON seaport_order_asset (token);

CREATE INDEX IF NOT EXISTS seaport_order_asset_new_is_fillable_idx
  ON seaport_order_asset (is_fillable);

CREATE INDEX IF NOT EXISTS seaport_order_asset_seaport_order_id_index
  ON seaport_order_asset (seaport_order_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS seaport_order_asset;

-- +goose StatementEnd