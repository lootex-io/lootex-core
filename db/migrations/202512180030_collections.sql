-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS collections
(
  id                             uuid                     DEFAULT uuid_generate_v1() NOT NULL PRIMARY KEY,
  owner_account_id               uuid REFERENCES user_accounts,
  contract_address               varchar(255)                                        NOT NULL,
  banner_image_url               varchar(255)             DEFAULT NULL::character varying,
  logo_image_url                 varchar(255)             DEFAULT NULL::character varying,
  name                           varchar(255)                                        NOT NULL,
  slug                           varchar(255)                                        NOT NULL UNIQUE,
  description                    text,
  external_links                 jsonb,
  is_verified                    boolean                  DEFAULT false,
  is_sensitive                   boolean                  DEFAULT false,
  creator_fee                    numeric                  DEFAULT 0 CHECK ((creator_fee >= 0) AND (creator_fee <= 100.0)),
  service_fee                    numeric                  DEFAULT 2.5 CHECK ((service_fee >= 2.5) AND (service_fee <= 100.0)),
  created_at                     timestamp with time zone DEFAULT now()              NOT NULL,
  deleted_at                     timestamp with time zone,
  updated_at                     timestamp with time zone DEFAULT now()              NOT NULL,
  chain_short_name               varchar(255)             DEFAULT 'eth'::character varying,
  owner_address                  varchar(255)             DEFAULT 'eth'::character varying,
  is_block                       boolean,
  chain_id                       integer,
  block                          block_status             DEFAULT 'Normal'::block_status,
  featured_image_url             varchar,
  official_address               varchar,
  verified_collection            boolean                  DEFAULT true,
  featured_video_url             varchar,
  is_minting                     boolean                  DEFAULT false,
  is_campaign_202408_featured    boolean                  DEFAULT false,
  is_drop                        boolean                  DEFAULT false              NOT NULL,
  is_creator_fee                 boolean                  DEFAULT false              NOT NULL,
  creator_fee_address            varchar,
  best_collection_offer_order_id uuid,
  total_listing                  integer                  DEFAULT 0,
  total_offer                    integer                  DEFAULT 0,
  CONSTRAINT collections_pk_contract_address_chain_id UNIQUE (contract_address, chain_id)
);

CREATE INDEX IF NOT EXISTS contract_address_idx
  ON collections (contract_address);

CREATE INDEX IF NOT EXISTS collections_block_index
  ON collections (block);

CREATE INDEX IF NOT EXISTS collections_best_collection_offer_order_id_index
  ON collections (best_collection_offer_order_id);

-- 需要 pg_trgm
CREATE INDEX IF NOT EXISTS collections_name_trgm_index
  ON collections USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS collections_contract_address_pattern_index
  ON collections (contract_address varchar_pattern_ops);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS collections;

-- +goose StatementEnd