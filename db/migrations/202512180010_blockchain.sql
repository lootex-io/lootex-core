-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS blockchain
(
  id              uuid                     DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
  name            varchar,
  chain           varchar,
  network         varchar,
  rpc             jsonb,
  faucets         jsonb,
  native_currency jsonb,
  info_url        varchar,
  short_name      varchar,
  chain_id        integer,
  network_id      integer,
  slip44          integer,
  ens             jsonb,
  created_at      timestamp with time zone DEFAULT now(),
  deleted_at      timestamp with time zone,
  updated_at      timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blockchain_chain_id_index
  ON blockchain (chain_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS blockchain;

-- +goose StatementEnd