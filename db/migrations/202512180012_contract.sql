-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS contract
(
  id                 uuid                     DEFAULT uuid_generate_v1()    NOT NULL PRIMARY KEY,
  address            bytea                                                 NOT NULL,
  name               varchar,
  description        varchar,
  image_url          varchar,
  created_at         timestamp with time zone DEFAULT now(),
  deleted_at         timestamp with time zone,
  updated_at         timestamp with time zone DEFAULT now(),
  slug               varchar,
  external_url       varchar,
  created_date       timestamp with time zone,
  symbol             varchar,
  total_supply       varchar,
  schema_name        varchar,
  icon_url           varchar,
  allowed_currency   character varying[]      DEFAULT ARRAY['WETH'::text]   NOT NULL,
  image_props        jsonb                    DEFAULT '{}'::jsonb,
  meta               jsonb                    DEFAULT '{}'::jsonb,
  blockchain_id      uuid                                                  NOT NULL REFERENCES blockchain,
  x_traits_path      varchar,
  x_traits_extractor varchar,
  chain_id           integer,
  total_owners       varchar                  DEFAULT '0'::character varying,
  CONSTRAINT contract_address_blockchain_id_unique UNIQUE (address, blockchain_id)
);

CREATE INDEX IF NOT EXISTS contract_address_index
  ON contract (address);

CREATE INDEX IF NOT EXISTS contract_blockchain_id_idx
  ON contract (blockchain_id);

CREATE INDEX IF NOT EXISTS contract_name_lower_gin_index
  ON contract USING gin (lower(name::text) gin_trgm_ops);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS contract;

-- +goose StatementEnd