-- +goose Up
-- +goose StatementBegin

INSERT INTO user_wallets (id, account_id, transport, provider, chain_family, is_main_wallet, address, status, raw_data, created_at, deleted_at, updated_at) VALUES
  ('9b882fbe-b0e9-11ed-bd70-1b7a372e2262', '9b87fab2-b0e9-11ed-bd70-1b7a372e2262', 'Injected', 'METAMASK_INJECTED', 'ETH', false, '0x0000000000000000000000000000000000000000', 'ACTIVE', null, now(), null, now());
INSERT INTO user_accounts (id, email, username, fullname, avatar_url, introduction, status, created_at, deleted_at, updated_at, block) VALUES
  ('9b87fab2-b0e9-11ed-bd70-1b7a372e2262', 'collection_master@lootex.io', 'burn_address', 'Collection Master', null, null, 'ACTIVE', now(), null, now(), 'Normal');

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DELETE FROM user_wallets WHERE id = '9b882fbe-b0e9-11ed-bd70-1b7a372e2262';
DELETE FROM user_accounts WHERE id = '9b87fab2-b0e9-11ed-bd70-1b7a372e2262';

-- +goose StatementEnd