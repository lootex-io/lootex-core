-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS poller_progress_project
(
  project_name      text PRIMARY KEY,
  chain_id          integer NOT NULL,
  chain_name        text    NOT NULL,
  last_polled_block integer NOT NULL,
  created_at        timestamp with time zone DEFAULT now(),
  updated_at        timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS poller_progress_project_name_index
  ON poller_progress_project (project_name);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS poller_progress_project;

-- +goose StatementEnd