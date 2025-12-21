-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS currency
(
  id            uuid                     DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
  address       bytea                                               NOT NULL,
  name          varchar,
  symbol        varchar,
  decimals      integer,
  is_native     boolean,
  is_wrapped    boolean,
  blockchain_id uuid REFERENCES blockchain,
  created_at    timestamp with time zone DEFAULT now(),
  deleted_at    timestamp with time zone,
  updated_at    timestamp with time zone DEFAULT now(),
  CONSTRAINT currency_address_blockchain_id_unique UNIQUE (address, blockchain_id)
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS currency;

-- +goose StatementEnd