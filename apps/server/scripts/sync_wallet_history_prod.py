import os
import pandas as pd
from sqlalchemy import create_engine
from google.cloud import bigquery
from datetime import datetime, timedelta
import uuid

# 设置数据库连接
db_host = os.getenv('DB_HOST_PROD')
db_user = os.getenv('DB_USER_PROD')
db_password = os.getenv('DB_PASSWORD_PROD')
db_name = os.getenv('DB_NAME_PROD')
db_url = f'postgresql://{db_user}:{db_password}@{db_host}/{db_name}'
engine = create_engine(db_url)

# 计算时间范围
yesterday = datetime.now() - timedelta(days=1)
start_time = yesterday.strftime('%Y-%m-%d 00:00:00')
end_time = yesterday.strftime('%Y-%m-%d 23:59:59')

# 计算时间范围
# start_time = (datetime.now() - timedelta(days=45)).strftime('%Y-%m-%d 00:00:00')
# end_time = (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d 23:59:59')


# 从数据库中提取数据
query = f"""
SELECT wallet_history.id, wallet_address, chain_id, contract_address, event, tag, is_main_event, symbol, out_amount, in_amount, out_amount_usd, in_amount_usd, to_address, nft_address, currency_address, token_id, bool, block_time, wallet_history.block, tx_hash, log_index, fee, native_usd_price, ip, area, wallet_history.created_at, wallet_history.updated_at, wallet_history.deleted_at, is_sa, is_paymaster, order_hash, username
FROM wallet_history
LEFT JOIN user_wallets ON wallet_history.wallet_address = user_wallets.address
LEFT JOIN user_accounts ON user_wallets.account_id = user_accounts.id
WHERE wallet_history.created_at BETWEEN '{start_time}' AND '{end_time}'
"""
df = pd.read_sql(query, engine)

column_types = {
    'id': 'STRING',
    'wallet_address': 'STRING',
    'chain_id': 'INT64',
    'contract_address': 'STRING',
    'event': 'STRING',
    'tag': 'STRING',
    'is_main_event': 'BOOLEAN',
    'symbol': 'STRING',
    'out_amount': 'STRING',
    'in_amount': 'STRING',
    'out_amount_usd': 'STRING',
    'in_amount_usd': 'STRING',
    'to_address': 'STRING',
    'nft_address': 'STRING',
    'currency_address': 'STRING',
    'token_id': 'STRING',
    'bool': 'BOOLEAN',
    'block_time': 'TIMESTAMP',
    'block': 'INT64',
    'tx_hash': 'STRING',
    'log_index': 'INT64',
    'fee': 'STRING',
    'native_usd_price': 'STRING',
    'ip': 'STRING',
    'area': 'STRING',
    'created_at': 'TIMESTAMP',
    'updated_at': 'TIMESTAMP',
    'deleted_at': 'TIMESTAMP',
    'is_sa': 'BOOLEAN',
    'is_paymaster': 'BOOLEAN',
    'order_hash': 'STRING'
}

# 将 DataFrame 列转换为指定类型
for column, bq_type in column_types.items():
    if column in df.columns:
        if bq_type == 'INT64':
            df[column] = pd.to_numeric(df[column], errors='coerce').fillna(0).astype('int64')
        elif bq_type == 'FLOAT64':
            df[column] = pd.to_numeric(df[column], errors='coerce').fillna(0.0).astype('float64')
        elif bq_type == 'TIMESTAMP':
            df[column] = pd.to_datetime(df[column], errors='coerce')
        elif bq_type == 'BOOLEAN':
            df[column] = df[column].astype(bool)
        else:
            df[column] = df[column].astype(str)

# 设置 BigQuery 客户端
client = bigquery.Client()

# 设置目标表
table_id = 'bigquerytrial-423307.txhash.wallet_history_prod'

# 将数据写入 BigQuery
job = client.load_table_from_dataframe(df, table_id)

job.result()  # 等待加载完成
print(f"Loaded {len(df)} rows into {table_id}.")
