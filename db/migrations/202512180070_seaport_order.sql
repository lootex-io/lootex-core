-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS seaport_order
(
  id                                 uuid                               NOT NULL PRIMARY KEY,
  offerer                            bytea                              NOT NULL,
  signature                          bytea                              NOT NULL,
  hash                               bytea                              NOT NULL,
  category                           seaport_order_category,
  order_type                         integer                            NOT NULL,
  start_time                         integer                            NOT NULL,
  end_time                           integer                            NOT NULL,
  is_fillable                        boolean                            NOT NULL,
  is_cancelled                       boolean                            NOT NULL,
  is_expired                         boolean                            NOT NULL,
  is_validated                       boolean                            NOT NULL,
  total_original_consideration_items integer                            NOT NULL,
  zone                               bytea                              NOT NULL,
  zone_hash                          bytea                              NOT NULL,
  counter                            varchar                            NOT NULL,
  conduit_key                        bytea                              NOT NULL,
  salt                               bytea                              NOT NULL,
  price                              real,
  exchange_address                   bytea                              NOT NULL,
  chain_id                           integer                            NOT NULL,
  created_at                         timestamp with time zone DEFAULT now(),
  deleted_at                         timestamp with time zone,
  updated_at                         timestamp with time zone DEFAULT now(),
  per_price                          real,
  offer_type                         offer_type,
  platform_type                      integer                  DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS seaport_order_new_category_idx
  ON seaport_order (category);

CREATE UNIQUE INDEX IF NOT EXISTS seaport_order_new_id_idx
  ON seaport_order (id);

CREATE INDEX IF NOT EXISTS seaport_order_new_offerer_idx
  ON seaport_order (offerer);

CREATE INDEX IF NOT EXISTS seaport_order_new_price_idx
  ON seaport_order (price);

CREATE INDEX IF NOT EXISTS seaport_order_new_is_fillable_is_cancelled_idx
  ON seaport_order (is_fillable, is_cancelled);

CREATE INDEX IF NOT EXISTS seaport_order_new_category_offer_type_idx
  ON seaport_order (category, offer_type);

CREATE INDEX IF NOT EXISTS seaport_order_new_per_price_idx
  ON seaport_order (per_price);

CREATE INDEX IF NOT EXISTS seaport_order_new_platform_type_idx
  ON seaport_order (platform_type);

CREATE INDEX IF NOT EXISTS seaport_order_new_end_time_idx
  ON seaport_order (end_time);

CREATE INDEX IF NOT EXISTS seaport_order_new_id_is_fillable_is_expired_idx
  ON seaport_order (id, is_fillable, is_expired);

CREATE UNIQUE INDEX IF NOT EXISTS seaport_order_new_hash_chain_id_idx
  ON seaport_order (hash, chain_id);

CREATE INDEX IF NOT EXISTS seaport_order_new_price_id_idx
  ON seaport_order (price, id);

CREATE INDEX IF NOT EXISTS seaport_order_is_fillable_per_price_chain_id_idx
  ON seaport_order (is_fillable, per_price, chain_id, id)
  WHERE (is_fillable = true);

CREATE INDEX IF NOT EXISTS idx_seaport_order_fillable_expired
  ON seaport_order (is_fillable, is_expired, id);

CREATE INDEX IF NOT EXISTS seaport_order_fillable_expired_index
  ON seaport_order (is_fillable, is_expired);

CREATE INDEX IF NOT EXISTS seaport_order_end_time_status_index
  ON seaport_order (end_time, is_expired, is_fillable);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS seaport_order;

-- +goose StatementEnd