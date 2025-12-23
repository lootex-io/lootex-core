-- +goose Up
-- +goose StatementBegin


DROP MATERIALIZED VIEW IF EXISTS collection_trading_board_one_hour;

CREATE MATERIALIZED VIEW collection_trading_board_one_hour AS
WITH trading_data AS (
    SELECT
        collection_trading_data.chain_id,
        collection_trading_data.contract_address,
        -- 當前 1 小時的交易額
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '1 hours'
                    AND collection_trading_data."time" < now()
                    THEN collection_trading_data.trading_volume
                ELSE 0
            END) AS total_volume_last_1_hours,
        -- 前一個 1 小時的交易額
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '2 hours'
                    AND collection_trading_data."time" < now() - interval '1 hours'
                    THEN collection_trading_data.trading_volume
                ELSE 0
            END) AS total_volume_previous_1_hours,
        -- 當前 1 小時的交易次數
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '1 hours'
                    AND collection_trading_data."time" < now()
                    THEN collection_trading_data.trading_count
                ELSE 0
            END) AS total_count_last_1_hours,
        -- 前一個 1 小時的交易次數
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '2 hours'
                    AND collection_trading_data."time" < now() - interval '1 hours'
                    THEN collection_trading_data.trading_count
                ELSE 0
            END) AS total_count_previous_1_hours,
        -- 當前 1 小時最低地板價，排除 0
        MIN(CASE
                WHEN collection_trading_data.floor_price > 0
                    AND collection_trading_data."time" >= now() - interval '1 hours'
                    AND collection_trading_data."time" < now()
                    THEN collection_trading_data.floor_price
                ELSE NULL -- 排除 0
            END) AS min_floor_price,
        -- 前一個 1 小時最低地板價，排除 0
        MIN(CASE
                WHEN collection_trading_data.floor_price > 0
                    AND collection_trading_data."time" >= now() - interval '2 hours'
                    AND collection_trading_data."time" < now() - interval '1 hours'
                    THEN collection_trading_data.floor_price
                ELSE NULL -- 排除 0
            END) AS previous_floor_price
    FROM
        collection_trading_data
    WHERE
        collection_trading_data."time" >= now() - interval '2 hours' -- 僅查詢近 2 小時內的數據
    GROUP BY
        collection_trading_data.chain_id,
        collection_trading_data.contract_address
), trading_board AS (
    SELECT trading_data.chain_id,
           trading_data.contract_address,
           trading_data.total_volume_last_1_hours AS trading_volume,
           trading_data.total_count_last_1_hours AS trading_count,
           trading_data.min_floor_price,
           trading_data.previous_floor_price,
           trading_data.total_volume_previous_1_hours AS previous_volume,
           -- 避免除以零的檢查，只有當 previous_volume > 0 才計算百分比變化
           CASE
               WHEN COALESCE(trading_data.total_volume_previous_1_hours, 0) > 0 THEN
                   ROUND(
                           (COALESCE(trading_data.total_volume_last_1_hours, 0) - COALESCE(trading_data.total_volume_previous_1_hours, 0))
                               / COALESCE(trading_data.total_volume_previous_1_hours, 1) * 100,
                           2
                   )
               ELSE
                   0 -- 或設置為 0 表示無法計算變化
               END AS volume_change_percent
    FROM trading_data
)
SELECT date_trunc('hour', now()) AS truncated_time,
       trading_board.chain_id,
       trading_board.contract_address,
       trading_board.trading_volume,
       trading_board.trading_count,
       COALESCE(trading_board.min_floor_price, 0) AS min_floor_price,
       trading_board.previous_volume,
       trading_board.volume_change_percent,
       COALESCE(trading_board.previous_floor_price, 0) AS previous_floor_price,
       collections.id AS collection_id,
       collections.logo_image_url,
       collections.name,
       collections.is_verified,
       collections.slug,
       collections.chain_short_name,
       contract.total_supply,
       contract.total_owners
FROM trading_board
LEFT JOIN collections ON trading_board.contract_address::text = collections.contract_address::text AND
    trading_board.chain_id = collections.chain_id
LEFT JOIN contract ON trading_board.contract_address::text = encode(contract.address, 'escape'::text) AND
    trading_board.chain_id = contract.chain_id
WHERE collections.block = 'Normal';

REFRESH MATERIALIZED VIEW collection_trading_board_one_hour;

CREATE INDEX trading_board_one_hour_trading_volume_desc_idx
ON collection_trading_board_one_hour (trading_volume DESC);

CREATE INDEX trading_board_one_hour_chain_id_idx
ON collection_trading_board_one_hour (chain_id);

------------------------------------------------------------


DROP MATERIALIZED VIEW IF EXISTS collection_trading_board_one_day;

CREATE MATERIALIZED VIEW collection_trading_board_one_day AS
WITH trading_data AS (
    SELECT
        collection_trading_data.chain_id,
        collection_trading_data.contract_address,
        -- 當前 24 小時的交易額
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '24 hours'
                    AND collection_trading_data."time" < now()
                    THEN collection_trading_data.trading_volume
                ELSE 0
            END) AS total_volume_last_24_hours,
        -- 前一個 24 小時的交易額
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '48 hours'
                    AND collection_trading_data."time" < now() - interval '24 hours'
                    THEN collection_trading_data.trading_volume
                ELSE 0
            END) AS total_volume_previous_24_hours,
        -- 當前 24 小時的交易次數
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '24 hours'
                    AND collection_trading_data."time" < now()
                    THEN collection_trading_data.trading_count
                ELSE 0
            END) AS total_count_last_24_hours,
        -- 前一個 24 小時的交易次數
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '48 hours'
                    AND collection_trading_data."time" < now() - interval '24 hours'
                    THEN collection_trading_data.trading_count
                ELSE 0
            END) AS total_count_previous_24_hours,
        -- 當前 24 小時最低地板價，排除 0
        MIN(CASE
                WHEN collection_trading_data.floor_price > 0
                    AND collection_trading_data."time" >= now() - interval '24 hours'
                    AND collection_trading_data."time" < now()
                    THEN collection_trading_data.floor_price
                ELSE NULL -- 排除 0
            END) AS min_floor_price,
        -- 前一個 24 小時最低地板價，排除 0
        MIN(CASE
                WHEN collection_trading_data.floor_price > 0
                    AND collection_trading_data."time" >= now() - interval '48 hours'
                    AND collection_trading_data."time" < now() - interval '24 hours'
                    THEN collection_trading_data.floor_price
                ELSE NULL -- 排除 0
            END) AS previous_floor_price
    FROM
        collection_trading_data
    WHERE
        collection_trading_data."time" >= now() - interval '48 hours' -- 僅查詢近 48 小時內的數據
    GROUP BY
        collection_trading_data.chain_id,
        collection_trading_data.contract_address
), trading_board AS (
    SELECT trading_data.chain_id,
           trading_data.contract_address,
           trading_data.total_volume_last_24_hours AS trading_volume,
           trading_data.total_count_last_24_hours AS trading_count,
           trading_data.min_floor_price,
           trading_data.previous_floor_price,
           trading_data.total_volume_previous_24_hours AS previous_volume,
           -- 避免除以零的檢查，只有當 previous_volume > 0 才計算百分比變化
           CASE
               WHEN COALESCE(trading_data.total_volume_previous_24_hours, 0) > 0 THEN
                   ROUND(
                           (COALESCE(trading_data.total_volume_last_24_hours, 0) - COALESCE(trading_data.total_volume_previous_24_hours, 0))
                               / COALESCE(trading_data.total_volume_previous_24_hours, 1) * 100,
                           2
                   )
               ELSE
                   0 -- 或設置為 0 表示無法計算變化
               END AS volume_change_percent
    FROM trading_data
)
SELECT date_trunc('day'::text, now()) AS truncated_time,
       trading_board.chain_id,
       trading_board.contract_address,
       trading_board.trading_volume,
       trading_board.trading_count,
       COALESCE(trading_board.min_floor_price, 0) AS min_floor_price,
       trading_board.previous_volume,
       trading_board.volume_change_percent,
       COALESCE(trading_board.previous_floor_price, 0) AS previous_floor_price,
       collections.id AS collection_id,
       collections.logo_image_url,
       collections.name,
       collections.is_verified,
       collections.slug,
       collections.chain_short_name,
       contract.total_supply,
       contract.total_owners
FROM trading_board
LEFT JOIN collections ON trading_board.contract_address::text = collections.contract_address::text AND
    trading_board.chain_id = collections.chain_id
LEFT JOIN contract ON trading_board.contract_address::text = encode(contract.address, 'escape'::text) AND
    trading_board.chain_id = contract.chain_id
WHERE collections.block = 'Normal';

REFRESH MATERIALIZED VIEW collection_trading_board_one_day;

CREATE INDEX trading_board_one_day_trading_volume_desc_idx
ON collection_trading_board_one_day (trading_volume DESC);

CREATE INDEX trading_board_one_day_chain_id_idx
ON collection_trading_board_one_day (chain_id);

------------------------------------------------------------


DROP MATERIALIZED VIEW IF EXISTS collection_trading_board_one_week;

CREATE MATERIALIZED VIEW collection_trading_board_one_week AS
WITH trading_data AS (
    SELECT
        collection_trading_data.chain_id,
        collection_trading_data.contract_address,
        -- 當前 1 週的交易額
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '1 week'
                    AND collection_trading_data."time" < now()
                    THEN collection_trading_data.trading_volume
                ELSE 0
            END) AS total_volume_last_1_week,
        -- 前一個 1 週的交易額
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '2 weeks'
                    AND collection_trading_data."time" < now() - interval '1 week'
                    THEN collection_trading_data.trading_volume
                ELSE 0
            END) AS total_volume_previous_1_week,
        -- 當前 1 週的交易次數
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '1 week'
                    AND collection_trading_data."time" < now()
                    THEN collection_trading_data.trading_count
                ELSE 0
            END) AS total_count_last_1_week,
        -- 前一個 1 週的交易次數
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '2 weeks'
                    AND collection_trading_data."time" < now() - interval '1 week'
                    THEN collection_trading_data.trading_count
                ELSE 0
            END) AS total_count_previous_1_week,
        -- 當前 1 週最低地板價，排除 0
        MIN(CASE
                WHEN collection_trading_data.floor_price > 0
                    AND collection_trading_data."time" >= now() - interval '1 week'
                    AND collection_trading_data."time" < now()
                    THEN collection_trading_data.floor_price
                ELSE NULL -- 排除 0
            END) AS min_floor_price,
        -- 前一個 1 週最低地板價，排除 0
        MIN(CASE
                WHEN collection_trading_data.floor_price > 0
                    AND collection_trading_data."time" >= now() - interval '2 weeks'
                    AND collection_trading_data."time" < now() - interval '1 week'
                    THEN collection_trading_data.floor_price
                ELSE NULL -- 排除 0
            END) AS previous_floor_price
    FROM
        collection_trading_data
    WHERE
        collection_trading_data."time" >= now() - interval '2 weeks' -- 僅查詢近 2 週內的數據
    GROUP BY
        collection_trading_data.chain_id,
        collection_trading_data.contract_address
), trading_board AS (
    SELECT trading_data.chain_id,
           trading_data.contract_address,
           trading_data.total_volume_last_1_week AS trading_volume,
           trading_data.total_count_last_1_week AS trading_count,
           trading_data.min_floor_price,
           trading_data.previous_floor_price,
           trading_data.total_volume_previous_1_week AS previous_volume,
           -- 避免除以零的檢查，只有當 previous_volume > 0 才計算百分比變化
           CASE
               WHEN COALESCE(trading_data.total_volume_previous_1_week, 0) > 0 THEN
                   ROUND(
                           (COALESCE(trading_data.total_volume_last_1_week, 0) - COALESCE(trading_data.total_volume_previous_1_week, 0))
                               / COALESCE(trading_data.total_volume_previous_1_week, 1) * 100,
                           2
                   )
               ELSE
                   0 -- 或設置為 0 表示無法計算變化
               END AS volume_change_percent
    FROM trading_data
)
SELECT date_trunc('week'::text, now()) AS truncated_time,
       trading_board.chain_id,
       trading_board.contract_address,
       trading_board.trading_volume,
       trading_board.trading_count,
       COALESCE(trading_board.min_floor_price, 0) AS min_floor_price,
       trading_board.previous_volume,
       trading_board.volume_change_percent,
       COALESCE(trading_board.previous_floor_price, 0) AS previous_floor_price,
       collections.id AS collection_id,
       collections.logo_image_url,
       collections.name,
       collections.is_verified,
       collections.slug,
       collections.chain_short_name,
       contract.total_supply,
       contract.total_owners
FROM trading_board
LEFT JOIN collections ON trading_board.contract_address::text = collections.contract_address::text AND
    trading_board.chain_id = collections.chain_id
LEFT JOIN contract ON trading_board.contract_address::text = encode(contract.address, 'escape'::text) AND
    trading_board.chain_id = contract.chain_id
WHERE collections.block = 'Normal';

REFRESH MATERIALIZED VIEW collection_trading_board_one_week;

CREATE INDEX trading_board_one_week_trading_volume_desc_idx
ON collection_trading_board_one_week (trading_volume DESC);

CREATE INDEX trading_board_one_week_chain_id_idx
ON collection_trading_board_one_week (chain_id);

------------------------------------------------------------

DROP MATERIALIZED VIEW IF EXISTS collection_trading_board_one_month;

CREATE MATERIALIZED VIEW collection_trading_board_one_month AS
WITH trading_data AS (
    SELECT
        collection_trading_data.chain_id,
        collection_trading_data.contract_address,
        -- 當前 1 個月的交易額
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '1 month'
                    AND collection_trading_data."time" < now()
                    THEN collection_trading_data.trading_volume
                ELSE 0
            END) AS total_volume_last_1_month,
        -- 前一個 1 個月的交易額
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '2 months'
                    AND collection_trading_data."time" < now() - interval '1 month'
                    THEN collection_trading_data.trading_volume
                ELSE 0
            END) AS total_volume_previous_1_month,
        -- 當前 1 個月的交易次數
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '1 month'
                    AND collection_trading_data."time" < now()
                    THEN collection_trading_data.trading_count
                ELSE 0
            END) AS total_count_last_1_month,
        -- 前一個 1 個月的交易次數
        SUM(CASE
                WHEN collection_trading_data."time" >= now() - interval '2 months'
                    AND collection_trading_data."time" < now() - interval '1 month'
                    THEN collection_trading_data.trading_count
                ELSE 0
            END) AS total_count_previous_1_month,
        -- 當前 1 個月最低地板價，排除 0
        MIN(CASE
                WHEN collection_trading_data.floor_price > 0
                    AND collection_trading_data."time" >= now() - interval '1 month'
                    AND collection_trading_data."time" < now()
                    THEN collection_trading_data.floor_price
                ELSE NULL -- 排除 0
            END) AS min_floor_price,
        -- 前一個 1 個月最低地板價，排除 0
        MIN(CASE
                WHEN collection_trading_data.floor_price > 0
                    AND collection_trading_data."time" >= now() - interval '2 months'
                    AND collection_trading_data."time" < now() - interval '1 month'
                    THEN collection_trading_data.floor_price
                ELSE NULL -- 排除 0
            END) AS previous_floor_price
    FROM
        collection_trading_data
    WHERE
        collection_trading_data."time" >= now() - interval '2 months' -- 僅查詢近 2 個月內的數據
    GROUP BY
        collection_trading_data.chain_id,
        collection_trading_data.contract_address
), trading_board AS (
    SELECT trading_data.chain_id,
           trading_data.contract_address,
           trading_data.total_volume_last_1_month AS trading_volume,
           trading_data.total_count_last_1_month AS trading_count,
           trading_data.min_floor_price,
           trading_data.previous_floor_price,
           trading_data.total_volume_previous_1_month AS previous_volume,
           -- 避免除以零的檢查，只有當 previous_volume > 0 才計算百分比變化
           CASE
               WHEN COALESCE(trading_data.total_volume_previous_1_month, 0) > 0 THEN
                   ROUND(
                           (COALESCE(trading_data.total_volume_last_1_month, 0) - COALESCE(trading_data.total_volume_previous_1_month, 0))
                               / COALESCE(trading_data.total_volume_previous_1_month, 1) * 100,
                           2
                   )
               ELSE
                   0 -- 或設置為 0 表示無法計算變化
               END AS volume_change_percent
    FROM trading_data
)
SELECT date_trunc('month'::text, now()) AS truncated_time,
       trading_board.chain_id,
       trading_board.contract_address,
       trading_board.trading_volume,
       trading_board.trading_count,
       COALESCE(trading_board.min_floor_price, 0) AS min_floor_price,
       trading_board.previous_volume,
       trading_board.volume_change_percent,
       COALESCE(trading_board.previous_floor_price, 0) AS previous_floor_price,
       collections.id AS collection_id,
       collections.logo_image_url,
       collections.name,
       collections.is_verified,
       collections.slug,
       collections.chain_short_name,
       contract.total_supply,
       contract.total_owners
FROM trading_board
LEFT JOIN collections ON trading_board.contract_address::text = collections.contract_address::text AND
    trading_board.chain_id = collections.chain_id
LEFT JOIN contract ON trading_board.contract_address::text = encode(contract.address, 'escape'::text) AND
    trading_board.chain_id = contract.chain_id
WHERE collections.block = 'Normal';

REFRESH MATERIALIZED VIEW collection_trading_board_one_month;

CREATE INDEX trading_board_one_month_trading_volume_desc_idx
ON collection_trading_board_one_month (trading_volume DESC);

CREATE INDEX trading_board_one_month_chain_id_idx
ON collection_trading_board_one_month (chain_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP MATERIALIZED VIEW collection_trading_board_one_hour;
DROP MATERIALIZED VIEW collection_trading_board_one_day;
DROP MATERIALIZED VIEW collection_trading_board_one_week;
DROP MATERIALIZED VIEW collection_trading_board_one_month;


-- +goose StatementEnd
