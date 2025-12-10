#!/bin/bash

# 分析 order-sync 服務內存使用情況

echo "🔍 分析 order-sync 服務內存使用..."

# 1. 檢查 PM2 進程內存使用
echo "=========================================="
echo "📊 PM2 進程內存使用情況"
echo "=========================================="
pm2 list

echo ""
echo "📈 詳細內存統計:"
pm2 show order-sync

# 2. 檢查系統內存使用
echo ""
echo "=========================================="
echo "💾 系統內存使用情況"
echo "=========================================="
free -h

# 3. 檢查 Node.js 進程內存
echo ""
echo "=========================================="
echo "🟢 Node.js 進程內存使用"
echo "=========================================="
ps aux | grep node | grep -v grep | awk '{print $2, $4, $6, $11}' | head -10

# 4. 檢查數據庫連接數
echo ""
echo "=========================================="
echo "🗄️ 數據庫連接情況"
echo "=========================================="
psql -c "
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity;
" 2>/dev/null || echo "無法連接到數據庫"

# 5. 檢查長時間運行的查詢
echo ""
echo "=========================================="
echo "⏱️ 長時間運行的查詢"
echo "=========================================="
psql -c "
SELECT 
    pid,
    application_name,
    state,
    now() - query_start AS duration,
    LEFT(query, 100) as query_preview
FROM pg_stat_activity 
WHERE state = 'active' 
    AND now() - query_start > INTERVAL '30 seconds'
    AND pid <> pg_backend_pid()
ORDER BY duration DESC
LIMIT 5;
" 2>/dev/null || echo "無法連接到數據庫"

# 6. 檢查 order-sync 日誌中的內存相關錯誤
echo ""
echo "=========================================="
echo "📝 Order-Sync 日誌分析"
echo "=========================================="
pm2 logs order-sync --lines 50 | grep -i "memory\|heap\|out of memory\|gc" || echo "未發現內存相關日誌"

echo ""
echo "✅ 內存分析完成"
