-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS poller_progress
(
  chain_id          integer PRIMARY KEY,
  chain_name        text    NOT NULL,
  last_polled_block integer NOT NULL,
  created_at        timestamp with time zone DEFAULT now(),
  updated_at        timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS poller_progress_chain_id_index
  ON poller_progress (chain_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS poller_progress;

-- +goose StatementEnd