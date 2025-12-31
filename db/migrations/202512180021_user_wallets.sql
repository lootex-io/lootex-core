-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS user_wallets
(
  id             uuid                     DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
  account_id     uuid                                                NOT NULL REFERENCES user_accounts,
  transport      wallet_transports                                   NOT NULL,
  provider       wallet_providers                                    NOT NULL,
  chain_family   wallet_chain_families                               NOT NULL,
  is_main_wallet boolean                  DEFAULT false              NOT NULL,
  address        varchar(255)                                        NOT NULL UNIQUE,
  status         wallet_status            DEFAULT 'ACTIVE'::wallet_status,
  raw_data       text,
  created_at     timestamp with time zone DEFAULT now(),
  deleted_at     timestamp with time zone,
  updated_at     timestamp with time zone DEFAULT now()
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS user_wallets;

-- +goose StatementEnd