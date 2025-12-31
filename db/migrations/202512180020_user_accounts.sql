-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS user_accounts
(
  id              uuid                     DEFAULT uuid_generate_v1()       NOT NULL PRIMARY KEY,
  username        varchar(255)                                              NOT NULL,
  avatar_url      varchar(255)             DEFAULT NULL::character varying,
  introduction    text,
  status          account_status           DEFAULT 'ACTIVE'::account_status NOT NULL,
  created_at      timestamp with time zone DEFAULT now()                    NOT NULL,
  deleted_at      timestamp with time zone,
  updated_at      timestamp with time zone DEFAULT now()                    NOT NULL,
  block           block_status             DEFAULT 'Normal'::block_status,
  last_login_at   timestamp with time zone,
  register_ip     varchar,
  register_area   varchar,
  last_login_ip   varchar,
  last_login_area varchar
);

CREATE UNIQUE INDEX IF NOT EXISTS account_username_unique
  ON user_accounts (username);

CREATE INDEX IF NOT EXISTS user_accounts_block_index
  ON user_accounts (block);

CREATE INDEX IF NOT EXISTS user_accounts_username_trgm_index
  ON user_accounts USING gin (username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS user_accounts_last_login_at_idx
  ON user_accounts (last_login_at DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS user_accounts;

-- +goose StatementEnd