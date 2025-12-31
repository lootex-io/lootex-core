-- +goose Up
-- +goose StatementBegin

DO $$ BEGIN
  CREATE TYPE block_status AS ENUM ('Normal', 'Investigate', 'Blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wallet_status AS ENUM ('ACTIVE', 'SUSPEND', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wallet_transports AS ENUM ('Injected', 'Contract', 'Library');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wallet_providers AS ENUM ('METAMASK_INJECTED', 'PHANTOM_INJECTED', 'COINBASE_INJECTED', 'PETRA_INJECTED', 'COMPATIBLE_INJECTED', 'WALLET_CONNECT_1_LIBRARY', 'PRIVY_LIBRARY', 'PRIVY_LIBRARY_SA', 'TRUST_WALLET_MOBILE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wallet_chain_families AS ENUM ('ETH', 'SOL', 'FLOW', 'APTOS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE seaport_order_category AS ENUM ('listing', 'offer', 'auction', 'bundle', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE offer_type AS ENUM ('Normal', 'Collection', 'Specify');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_event_history_category AS ENUM ('list', 'offer', 'sale', 'collection_offer', 'transfer', 'mint', 'airdrop', 'burn', 'cancel');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status_type AS ENUM ('Init', 'Fulfilled', 'Expired', 'Validated', 'Canceled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TYPE IF EXISTS order_status_type;
DROP TYPE IF EXISTS asset_event_history_category;
DROP TYPE IF EXISTS offer_type;
DROP TYPE IF EXISTS seaport_order_category;
DROP TYPE IF EXISTS wallet_chain_families;
DROP TYPE IF EXISTS wallet_providers;
DROP TYPE IF EXISTS wallet_transports;
DROP TYPE IF EXISTS wallet_status;
DROP TYPE IF EXISTS account_status;
DROP TYPE IF EXISTS block_status;
DROP TYPE IF EXISTS asset_status;

-- +goose StatementEnd