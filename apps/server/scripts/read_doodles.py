import pandas as pd
import json
from pathlib import Path
from sqlalchemy import create_engine, text
from open_rarity import (
    Collection,
    Token,
    RarityRanker,
    TokenMetadata,
    StringAttribute,
    TokenStandard,
    EVMContractTokenIdentifier
)
import os
from dotenv import load_dotenv
import logging
from datetime import datetime
from tqdm import tqdm

def setup_logging():
    """設置日誌配置"""
    # 創建 logs 目錄（如果不存在）
    log_dir = Path('logs')
    log_dir.mkdir(exist_ok=True)
    
    # 設置日誌文件路徑
    log_file = log_dir / f'rarity_calculation_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.StreamHandler(),  # 輸出到控制台
            logging.FileHandler(log_file)  # 輸出到文件
        ]
    )

def get_database_config():
    """獲取數據庫配置"""
    # 加載 .env 文件
    load_dotenv()
    
    # 直接從環境變量獲取
    required_vars = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_NAME', 'COLLECTION_SLUG']
    
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        raise ValueError(f"缺少必要的環境變量: {', '.join(missing_vars)}")
    
    collection_slug = os.getenv('COLLECTION_SLUG')
    # 從 slug 中解析 contract_address
    contract_address = None
    if ':' in collection_slug:
        _, contract_address = collection_slug.split(':', 1)
        logging.info(f"從 collection_slug 解析出 contract_address: {contract_address}")
    else:
        raise ValueError(f"Collection slug 格式錯誤，應為 'name:contract_address'，實際為: {collection_slug}")
    
    return {
        'user': os.getenv('DB_USER'),
        'password': os.getenv('DB_PASSWORD'),
        'host': os.getenv('DB_HOST'),
        'port': os.getenv('DB_PORT', '5432'),
        'database': os.getenv('DB_NAME'),
        'collection_slug': collection_slug,
        'contract_address': contract_address
    }

def read_from_database(slug: str, connection_string: str) -> pd.DataFrame:
    """從數據庫讀取數據"""
    logging.info(f"開始從數據庫讀取集合 {slug} 的數據")
    try:
        engine = create_engine(connection_string)
        logging.info("成功創建數據庫連接")
        
        query = text("""
            SELECT 
                asset_extra.asset_id as id,
                asset.token_id::text as token_id,
                asset.traits::text as traits
            FROM asset_extra
            LEFT JOIN asset ON asset_extra.asset_id = asset.id
            LEFT JOIN collections ON asset_extra.collection_id = collections.id
            WHERE collections.slug = :slug
        """)
        
        with engine.connect() as connection:
            df = pd.read_sql(query, connection, params={'slug': slug})
            logging.info(f"成功讀取數據，共 {len(df)} 條記錄")
            return df
    except Exception as e:
        logging.error(f"從數據庫讀取數據時發生錯誤: {str(e)}")
        return None

def parse_traits(traits_str: str) -> list:
    """解析 traits JSON 字符串為屬性列表"""
    try:
        traits_str = traits_str.replace("'", '"')
        return json.loads(traits_str)
    except json.JSONDecodeError:
        print(f"解析 JSON 時發生錯誤: {traits_str}")
        return []

def prepare_attributes_frequency(df: pd.DataFrame) -> dict:
    """準備屬性頻率統計"""
    all_traits = {}
    for _, row in df.iterrows():
        traits = parse_traits(row['traits'])
        for trait in traits:
            trait_type = trait.get('trait_type')
            value = trait.get('value')
            if trait_type and value:
                if trait_type not in all_traits:
                    all_traits[trait_type] = {}
                if value not in all_traits[trait_type]:
                    all_traits[trait_type][value] = 0
                all_traits[trait_type][value] += 1
    return all_traits

def calculate_rarity_scores(df: pd.DataFrame, contract_address: str) -> pd.DataFrame:
    """算稀有度分數"""
    logging.info("開始計算稀有度分數")
    if df is None:
        logging.error("輸入數據為空，無法計算稀有度")
        return None
    
    # 確保 token_id 是整數
    df['token_id'] = df['token_id'].astype(int)
    logging.info("已將 token_id 轉換為整數")
    
    logging.info("開始準備屬性頻率統計")
    attributes_frequency = prepare_attributes_frequency(df)
    logging.info(f"完成屬性頻率統計，共 {len(attributes_frequency)} 種特徵")
    
    logging.info("開始準備 tokens 列表")
    tokens = []
    for idx, row in df.iterrows():
        # if idx % 100 == 0:
            # logging.info(f"正在處理第 {idx}/{len(df)} 個token")
        
        traits_data = parse_traits(row['traits'])
        string_attributes = {}
        for trait in traits_data:
            if trait.get('value') and trait.get('trait_type'):
                trait_type = trait['trait_type']
                string_attributes[trait_type] = StringAttribute(
                    name=trait_type,
                    value=str(trait['value'])
                )
        
        token = Token(
            token_identifier=EVMContractTokenIdentifier(
                contract_address=contract_address,
                token_id=int(row['token_id'])  # 確保使用整數
            ),
            token_standard=TokenStandard.ERC721,
            metadata=TokenMetadata(string_attributes=string_attributes)
        )
        tokens.append(token)
    
    logging.info(f"完成 tokens 列表準備，共 {len(tokens)} 個token")
    
    collection = Collection(
        name="NFT Collection",
        attributes_frequency_counts=attributes_frequency,
        tokens=tokens
    )
    
    logging.info("開始計算稀有度排名")
    ranked_tokens = RarityRanker.rank_collection(collection=collection)
    logging.info("完成稀有度排名計算")
    
    results = []
    for token_rarity in ranked_tokens:
        results.append({
            'token_id': token_rarity.token.token_identifier.token_id,
            'rank': token_rarity.rank,
            'rarity_score': token_rarity.score
        })
    
    df_results = pd.DataFrame(results)
    logging.info("完成稀有度計算並轉換為DataFrame格式")
    return df_results

def update_database(df: pd.DataFrame, connection_string: str, collection_slug: str) -> None:
    """更新數據庫"""
    logging.info(f"開始更新數據庫，集合: {collection_slug}")
    try:
        engine = create_engine(connection_string)
        logging.info("成功創建數據庫連接")
        
        # 檢查 is_rarity 狀態
        check_rarity_query = text("""
            SELECT is_rarity FROM collections WHERE slug = :slug
        """)
        
        with engine.connect() as conn:
            result = conn.execute(check_rarity_query, {'slug': collection_slug}).fetchone()
            needs_rarity_update = result and not result[0]
            logging.info(f"檢查 is_rarity 狀態: {needs_rarity_update}")
        
        # 確保 token_id 是整數字符串（沒有小數點）
        df['token_id'] = df['token_id'].astype(int).astype(str)
        token_ids = df['token_id'].tolist()
        logging.info(f"準備查詢 {len(token_ids)} 個 token 的映射關係")
        
        # 修改查詢以確保正確的類型轉換
        mapping_query = text("""
            SELECT asset.token_id::text, asset_extra.asset_id
            FROM asset_extra
            LEFT JOIN asset ON asset_extra.asset_id = asset.id
            LEFT JOIN collections ON asset_extra.collection_id = collections.id
            WHERE asset.token_id::text = ANY(:token_ids)
            AND collections.slug = :slug
        """)
        
        with engine.connect() as conn:
            result = conn.execute(mapping_query, {
                'token_ids': token_ids,
                'slug': collection_slug
            }).fetchall()
            
            # 創建映射字典
            token_to_asset = {r[0]: r[1] for r in result}  # token_id 已經是字符串
            logging.info(f"找到 {len(token_to_asset)} 個有效的 token 映射")
        
        # 準備更新值
        update_values = []
        with tqdm(total=len(df), desc="準備更新數據") as pbar:
            for _, row in df.iterrows():
                token_id = str(int(row['token_id']))  # 確保是整數的字符串形式
                if token_id in token_to_asset:
                    update_values.append(f"({row['rank']}, '{token_to_asset[token_id]}')")
                else:
                    logging.warning(f"找不到 token_id {token_id} 的映射")
                pbar.update(1)
                pbar.set_postfix({'已處理': len(update_values)})

        if update_values:
            logging.info(f"準備更新 {len(update_values)} 個token的排名")
            
            # 使用更大的批次大小
            batch_size = 5000
            total_batches = (len(update_values) + batch_size - 1) // batch_size
            
            with tqdm(total=total_batches, desc="批量更新") as pbar:
                for i in range(0, len(update_values), batch_size):
                    batch = update_values[i:i + batch_size]
                    batch_update_query = text(f"""
                        UPDATE asset_extra AS ae
                        SET rarity_ranking = v.rank
                        FROM (VALUES {','.join(batch)}) AS v(rank, asset_id)
                        WHERE ae.asset_id = v.asset_id::uuid
                        RETURNING ae.asset_id, ae.rarity_ranking
                    """)
                    
                    with engine.connect() as conn:
                        with conn.begin():
                            update_result = conn.execute(batch_update_query)
                            updated_rows = update_result.rowcount
                            logging.info(f"本批次更新了 {updated_rows} 行數據")
                            
                            if needs_rarity_update and i == 0:
                                update_collection_query = text("""
                                    UPDATE collections
                                    SET is_rarity = true
                                    WHERE slug = :slug
                                    RETURNING id, is_rarity
                                """)
                                collection_result = conn.execute(update_collection_query, {'slug': collection_slug})
                                logging.info(f"成功更新集合 {collection_slug} 的 is_rarity 狀態")
                    
                    pbar.update(1)
                    pbar.set_postfix({'已更新': min((i + batch_size), len(update_values))})
            
            # 驗證更新結果
            verify_query = text("""
                SELECT COUNT(*) as count, MIN(rarity_ranking) as min_rank, MAX(rarity_ranking) as max_rank
                FROM asset_extra ae
                JOIN asset a ON ae.asset_id = a.id
                JOIN collections c ON ae.collection_id = c.id
                WHERE c.slug = :slug AND ae.rarity_ranking IS NOT NULL
            """)
            
            with engine.connect() as conn:
                verify_result = conn.execute(verify_query, {'slug': collection_slug}).fetchone()
                logging.info(f"更新後的統計: 總計 {verify_result[0]} 個token有排名，"
                           f"排名範圍 {verify_result[1]} - {verify_result[2]}")
            
            logging.info("成功完成所有更新")
                
    except Exception as e:
        logging.error(f"更新數據庫時發生錯誤: {str(e)}")
        raise  # 重新拋出異常以便查看完整的錯誤信息

def calculate_trait_stats(df: pd.DataFrame) -> dict:
    """計算特徵統計信息
    
    Args:
        df: 包含 traits 數據的 DataFrame
        
    Returns:
        dict: 特徵統計信息，包含每個特徵的數量、百分比和稀有度分數
    """
    logging.info("開始計算特徵統計")
    trait_stats = {}
    total_tokens = len(df)
    
    # 統計每個特徵的出現次數
    for _, row in df.iterrows():
        traits = parse_traits(row['traits'])
        for trait in traits:
            trait_type = trait.get('trait_type')
            trait_value = trait.get('value')
            
            if trait_type and trait_value:
                if trait_type not in trait_stats:
                    trait_stats[trait_type] = {}
                if trait_value not in trait_stats[trait_type]:
                    trait_stats[trait_type][trait_value] = {
                        'count': 0,
                        'percentage': 0,
                        'rarity_score': 0
                    }
                trait_stats[trait_type][trait_value]['count'] += 1
    
    # 計算百分比和稀有度分數
    for trait_type in trait_stats:
        for trait_value in trait_stats[trait_type]:
            stats = trait_stats[trait_type][trait_value]
            stats['percentage'] = round((stats['count'] / total_tokens) * 100, 2)
            stats['rarity_score'] = 1 / (stats['count'] / total_tokens)
    
    logging.info(f"完成特徵統計，共 {len(trait_stats)} 種特徵類型")
    return trait_stats

def update_trait_percentages(trait_stats: dict, connection_string: str, collection_slug: str) -> None:
    """更新特徵稀有度百分比"""
    logging.info("開始更新特徵稀有度")
    try:
        engine = create_engine(connection_string)
        
        # 準備更新數據
        update_values = []
        for trait_type, values in trait_stats.items():
            for trait_value, stats in values.items():
                update_values.append(
                    f"('{trait_type}', '{trait_value}', {stats['percentage']})"
                )
        
        if update_values:
            # 使用臨時表和批量更新
            batch_size = 1000
            total_batches = (len(update_values) + batch_size - 1) // batch_size
            
            with tqdm(total=total_batches, desc="更新特徵稀有度") as pbar:
                for i in range(0, len(update_values), batch_size):
                    batch = update_values[i:i + batch_size]
                    
                    update_query = text(f"""
                        WITH temp_traits (trait_type, trait_value, percentage) AS (
                            VALUES {','.join(batch)}
                        )
                        UPDATE asset_traits AS at
                        SET rarity_percent = tt.percentage
                        FROM temp_traits tt
                        WHERE at.trait_type = tt.trait_type
                        AND at.value = tt.trait_value
                        AND at.collection_id = (
                            SELECT id FROM collections WHERE slug = :slug
                        )
                        RETURNING at.id
                    """)
                    
                    with engine.connect() as conn:
                        with conn.begin():
                            result = conn.execute(update_query, {'slug': collection_slug})
                            updated_rows = result.rowcount
                            logging.info(f"本批次更新了 {updated_rows} 行數據")
                    
                    pbar.update(1)
                    pbar.set_postfix({
                        '批次': f"{i//batch_size + 1}/{total_batches}",
                        '已更新': updated_rows
                    })
        
        # 驗證更新結果
        verify_query = text("""
            SELECT COUNT(*) as count
            FROM asset_traits at
            JOIN collections c ON at.collection_id = c.id
            WHERE c.slug = :slug AND at.rarity_percent IS NOT NULL
        """)
        
        with engine.connect() as conn:
            verify_result = conn.execute(verify_query, {'slug': collection_slug}).fetchone()
            logging.info(f"更新後的統統計: 總計 {verify_result[0]} 個特徵有稀有度數據")
        
        # 生成特徵稀有度報告
        report_rows = []
        for trait_type, values in trait_stats.items():
            for trait_value, stats in values.items():
                report_rows.append({
                    'trait_type': trait_type,
                    'trait_value': trait_value,
                    'count': stats['count'],
                    'percentage': f"{stats['percentage']}%",
                    'rarity_score': str(stats['rarity_score'])
                })
        
        # 保存報告
        report_df = pd.DataFrame(report_rows)
        output_path = "data/trait_stats.xlsx"
        report_df.to_excel(output_path, index=False)
        logging.info(f"特徵稀有度報告已保存至: {output_path}")
        
    except Exception as e:
        logging.error(f"更新特徵稀有度時發生錯誤: {str(e)}")
        raise

def main():
    # 設置日誌
    setup_logging()
    logging.info("開始執行稀有度計算程序")
    
    try:
        config = get_database_config()
        logging.info("成功獲取配置信息")
        
        connection_string = f"postgresql://{config['user']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}"
        
        df = read_from_database(config['collection_slug'], connection_string)
        if df is not None:
            logging.info("數據預覽:")
            logging.info(df.head())
            
            # 計算特徵統計
            trait_stats = calculate_trait_stats(df)
            
            # 更新特徵稀有度
            update_trait_percentages(trait_stats, connection_string, config['collection_slug'])
            
            # 計算稀有度排名
            rankings = calculate_rarity_scores(df, config['contract_address'])
            logging.info("稀有度排名（前10名）:")
            logging.info(rankings.sort_values('rank').head(10))
            
            # 更新數據庫
            update_database(rankings, connection_string, config['collection_slug'])
            
            # 保存結果
            output_path = "data/rankings.xlsx"
            rankings.to_excel(output_path, index=False)
            logging.info(f"排名結果已保存至: {output_path}")
        
        logging.info("程序執行完成")
    except Exception as e:
        logging.error(f"程序執行過程中發生錯誤: {str(e)}")

if __name__ == "__main__":
    main() 