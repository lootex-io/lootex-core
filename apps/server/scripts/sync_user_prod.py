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

# # 计算时间范围
# yesterday = datetime.now() - timedelta(days=1)
# start_time = yesterday.strftime('%Y-%m-%d 00:00:00')
# end_time = yesterday.strftime('%Y-%m-%d 23:59:59')

# 手動設定時間範圍
start_time = '2023-06-10 00:00:00'
end_time = '2024-09-12 23:59:59'

# 如果需要格式化，可以使用 datetime 的解析函數將字符串轉換為 datetime 物件（如果需要）
start_time_dt = datetime.strptime(start_time, '%Y-%m-%d %H:%M:%S')
end_time_dt = datetime.strptime(end_time, '%Y-%m-%d %H:%M:%S')


# 从数据库中提取数据，只提取指定的字段
query = f"""
SELECT user_accounts.id, username, user_accounts.created_at, roles, last_login_at
FROM user_accounts
WHERE user_accounts.updated_at BETWEEN '{start_time}' AND '{end_time}'
"""
df = pd.read_sql(query, engine)

# BigQuery 对应的字段类型定义
column_types = {
    'id': 'STRING',
    'username': 'STRING',
    'created_at': 'TIMESTAMP',
    'roles': 'STRING',
    'last_login_at': 'TIMESTAMP'
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

# 设置目标表，假设你有一个对应的表格，比如 user_accounts_dev
table_id = 'bigquerytrial-423307.txhash.user_accounts_prod'

# 将数据写入 BigQuery
job = client.load_table_from_dataframe(df, table_id)

job.result()  # 等待加载完成
print(f"Loaded {len(df)} rows into {table_id}.")
