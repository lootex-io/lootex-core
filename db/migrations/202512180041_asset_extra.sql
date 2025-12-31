-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS asset_extra
(
  id                         uuid                     DEFAULT uuid_generate_v1()    NOT NULL PRIMARY KEY,
  asset_id                   uuid                                                   NOT NULL UNIQUE,
  collection_id              uuid,
  created_at                 timestamp with time zone DEFAULT now()                 NOT NULL,
  deleted_at                 timestamp with time zone,
  updated_at                 timestamp with time zone DEFAULT now()                 NOT NULL,
  best_offer_order_id        uuid,
  best_listing_order_id      uuid,
  best_offer_symbol          varchar                  DEFAULT ''::character varying NOT NULL,
  best_listing_symbol        varchar                  DEFAULT ''::character varying NOT NULL,
  chain_id                   integer,
  contract_id                uuid,
  asset_created_at           timestamp,
  block                      block_status             DEFAULT 'Normal'::block_status,
  last_created_listing_at    timestamp with time zone,
  view_count                 integer                  DEFAULT 0                     NOT NULL,
  rarity_ranking             integer,
  best_listing_per_price     real,
  best_listing_platform_type integer,
  best_offer_per_price       real,
  best_offer_platform_type   integer,

  CONSTRAINT asset_extra_asset_fk FOREIGN KEY (asset_id) REFERENCES asset(id)
);

CREATE INDEX IF NOT EXISTS asset_offer_id_index
  ON asset_extra (best_offer_order_id);

CREATE INDEX IF NOT EXISTS asset_listing_id_index
  ON asset_extra (best_listing_order_id);

CREATE INDEX IF NOT EXISTS asset_extra_asset_created_index
  ON asset_extra (asset_created_at);

CREATE INDEX IF NOT EXISTS asset_extra_chain_index
  ON asset_extra (chain_id);

CREATE INDEX IF NOT EXISTS asset_extra_collection_index
  ON asset_extra (collection_id);

CREATE INDEX IF NOT EXISTS asset_extra_block_index
  ON asset_extra (block);

CREATE INDEX IF NOT EXISTS asset_extra_last_created_listing_at_index
  ON asset_extra (last_created_listing_at DESC);

CREATE INDEX IF NOT EXISTS asset_extra_view_count_index
  ON asset_extra (view_count);

CREATE INDEX IF NOT EXISTS asset_extra_rarity_ranking_index
  ON asset_extra (rarity_ranking);

CREATE INDEX IF NOT EXISTS idx_asset_extra_chain_best_listing
  ON asset_extra (chain_id, best_listing_order_id)
  WHERE (best_listing_order_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_asset_extra_created_at
  ON asset_extra (asset_created_at DESC);

CREATE INDEX IF NOT EXISTS idx_asset_extra_assetid_listing
  ON asset_extra (asset_id)
  WHERE (best_listing_order_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_asset_extra_collection_chain
  ON asset_extra (collection_id, chain_id);

CREATE INDEX IF NOT EXISTS idx_asset_extra_chain_created_listing
  ON asset_extra (chain_id ASC, asset_created_at DESC, best_listing_order_id ASC)
  WHERE (best_listing_order_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_asset_extra_chain_created_offer
  ON asset_extra (chain_id ASC, asset_created_at DESC, best_offer_order_id ASC)
  WHERE (best_offer_order_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_asset_extra_asset_id_cover
  ON asset_extra (asset_id)
  INCLUDE (id, collection_id, chain_id, best_listing_order_id, best_offer_order_id, contract_id);

CREATE INDEX IF NOT EXISTS asset_extra_best_listing_per_price_index
  ON asset_extra (best_listing_per_price);

CREATE INDEX IF NOT EXISTS asset_extra_best_offer_per_price_index
  ON asset_extra (best_offer_per_price);

CREATE INDEX IF NOT EXISTS asset_extra_best_listing_platform_type_index
  ON asset_extra (best_listing_platform_type);

CREATE INDEX IF NOT EXISTS asset_extra_best_offer_platform_type_index
  ON asset_extra (best_offer_platform_type);

CREATE INDEX IF NOT EXISTS idx_ae_chain_block_price_asc_cover
  ON asset_extra (chain_id ASC, block ASC, best_listing_per_price ASC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS asset_extra_optimized_listing_idx
  ON asset_extra (chain_id ASC, best_listing_per_price ASC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS asset_extra_desc_listing_idx
  ON asset_extra (chain_id ASC, best_listing_per_price DESC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS idx_asset_extra_unlisted_created_at
  ON asset_extra (asset_created_at DESC, asset_id ASC)
  WHERE (best_listing_order_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_asset_extra_unblocked_price_date_sort
  ON asset_extra (best_listing_per_price ASC, asset_created_at DESC)
  WHERE (block = ANY (ARRAY ['Normal'::block_status, 'Investigate'::block_status]));

CREATE INDEX IF NOT EXISTS idx_asset_extra_best_listing_per_price_desc_nulls_last
  ON asset_extra (best_listing_per_price DESC);

CREATE INDEX IF NOT EXISTS idx_asset_extra_chain_offer_sort
  ON asset_extra (chain_id ASC, block ASC, best_offer_per_price DESC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS idx_asset_extra_global_offer_sort
  ON asset_extra (block ASC, best_offer_per_price DESC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS idx_asset_extra_collection_offer_sort
  ON asset_extra (collection_id ASC, block ASC, best_offer_per_price DESC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS idx_asset_extra_best_listing_order_id
  ON asset_extra (best_listing_order_id)
  WHERE (best_listing_order_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_asset_extra_best_offer_order_id
  ON asset_extra (best_offer_order_id)
  WHERE (best_offer_order_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_asset_extra_has_offer_price_desc
  ON asset_extra (best_offer_per_price DESC, asset_created_at DESC)
  WHERE ((block <> 'Blocked'::block_status) AND (best_offer_order_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_asset_extra_chain_has_offer_price_desc
  ON asset_extra (chain_id ASC, best_offer_per_price DESC, asset_created_at DESC)
  WHERE ((block <> 'Blocked'::block_status) AND (best_offer_order_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_asset_extra_collection_has_offer_price_desc
  ON asset_extra (collection_id ASC, best_offer_per_price DESC, asset_created_at DESC)
  WHERE ((block <> 'Blocked'::block_status) AND (best_offer_order_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_asset_extra_listing_price_asc_created
  ON asset_extra (collection_id ASC, chain_id ASC, best_listing_per_price ASC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS idx_asset_extra_listing_price_desc_created
  ON asset_extra (collection_id ASC, chain_id ASC, best_listing_per_price DESC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS idx_asset_extra_listing_price_range
  ON asset_extra (chain_id, collection_id, best_listing_per_price)
  WHERE ((block <> 'Blocked'::block_status) AND (best_listing_per_price IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_asset_extra_global_listing_price_asc
  ON asset_extra (best_listing_per_price ASC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS idx_asset_extra_global_listing_price_desc
  ON asset_extra (best_listing_per_price DESC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS idx_asset_extra_chain_listing_asc
  ON asset_extra (chain_id ASC, best_listing_per_price ASC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS idx_asset_extra_chain_listing_desc
  ON asset_extra (chain_id ASC, best_listing_per_price DESC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS idx_asset_extra_chain_created_desc
  ON asset_extra (chain_id ASC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_extra_asset_id
  ON asset_extra (asset_id);

CREATE INDEX IF NOT EXISTS idx_asset_extra_chain_listing_asc_sort
  ON asset_extra (chain_id ASC, block ASC, best_listing_per_price ASC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

CREATE INDEX IF NOT EXISTS idx_asset_extra_chain_listing_desc_sort
  ON asset_extra (chain_id ASC, block ASC, best_listing_per_price DESC, asset_created_at DESC)
  WHERE (block <> 'Blocked'::block_status);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS asset_extra;

-- +goose StatementEnd