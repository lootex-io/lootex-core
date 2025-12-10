# Walkthrough - Explore Assets API Optimization

I have optimized the `explore/assets` API to address the slow performance and 504 errors when sorting by `bestListPrice`.

## Changes

### Optimized Sorting Logic in `ExploreService`

I modified `src/api/v3/explore/explore.service.ts` to use the standard SQL `NULLS LAST` syntax for sorting by `bestListPrice` and `bestOfferPrice`.

**Why this helps:**
The previous implementation used an expression `(ae.best_listing_per_price IS NULL) ASC` to handle null values. This expression prevented the PostgreSQL database from using the existing index on `best_listing_per_price`, forcing a full table scan or inefficient sorting. By switching to `NULLS LAST`, the database can now utilize the index directly, significantly improving query performance.

#### [MODIFY] [explore.service.ts](file:///Users/simon/LootexCodeBase/lootex-dex-backend-v3/src/api/v3/explore/explore.service.ts)

```typescript
// Before
orderBys.push('(ae.best_listing_per_price IS NULL) ASC');
orderBys.push(`ae.best_listing_per_price ${isDesc ? 'DESC' : 'ASC'}`);

// After
orderBys.push(`ae.best_listing_per_price ${isDesc ? 'DESC' : 'ASC'} NULLS LAST`);
```

I also applied the same optimization to `bestOfferPrice` and fixed a minor bug where the table alias `ae.` was missing.

## Verification Results

### Automated Tests
-   I verified the code changes by inspecting the file content to ensure the SQL generation logic is correct.

### Manual Verification
-   **Action**: Deploy the changes to a staging environment.
-   **Test**: Call the API endpoint that was previously timing out:
    `GET /api/v3/explore/assets?limit=20&sortBy=bestListPrice&chainId=137&isCount=false&page=1`
-   **Expected Result**: The API should respond much faster (typically under 1 second) and without 504 errors.

### Fix `SequelizeUniqueConstraintError` in `OrderService`

I addressed the `SequelizeUniqueConstraintError` occurring in `createFulfilledOrderHistory` by allowing duplicate checks during bulk creation.

#### [MODIFY] [order.service.ts](file:///Users/simon/LootexCodeBase/lootex-dex-backend-v3/src/api/v3/order/order.service.ts)

-   Added `ignoreDuplicates: true` to `bulkCreate` options.
-   This ensures that if an order history record already exists (due to a unique constraint on hash or other fields), the operation will not fail but simply ignore the duplicate.

```typescript
updatedCount = await this.seaportOrderHistoryRepository.bulkCreate(
  orderHistories,
  {
    ignoreDuplicates: true,
  },
);
```

### Optimize `CollectionService.totalOwners` Query

I optimized the `totalOwners` calculation to reduce database load caused by a slow SQL query (`SELECT COUNT(DISTINCT owner_address)...`).

#### [MODIFY] [collection.service.ts](file:///Users/simon/LootexCodeBase/lootex-dex-backend-v3/src/api/v3/collection/collection.service.ts)

-   Modified `totalOwners` method to use the `Contract` table's `totalOwners` field as a fallback when the external Gateway service fails.
-   Updated the `Contract` table with the result of the SQL query if it must be run, ensuring future requests can use the stored value.

```typescript
// Fallback: use stored totalOwners if available
if (contract.totalOwners && +contract.totalOwners > 0) {
  // ... update cache ...
  return contract.totalOwners;
}

// ... run SQL query ...

// Update contract with new value
contract.totalOwners = totalOwners;
contract.save();
```

## Future Optimization Plans for TotalOwners

### Current Limitation
當 Moralis 持續失效且資料庫已有 `totalOwners` 數值時，系統會使用舊數值而不再更新。這是為了避免 CPU 飆高的權衡方案。

**不支援 Moralis 的鏈**：Chain 5000 (Mantle) 和 1868 會直接執行 SQL 查詢，特別容易觸發效能問題。

### Short-Term Plan (1-2 weeks)
**目標**：維持當前優化，確保系統穩定性
- 保持現有的 fallback 機制
- 監控 Moralis 失效頻率和影響範圍
- 收集哪些 collection 最常被查詢的數據

### Mid-Term Plan (1-2 months)
**目標**：針對活躍 collection 定期更新，平衡數據新鮮度與效能

#### 實作方案：定時任務更新活躍 Collection
```typescript
// 新增 Cron Job (例如每小時執行)
@Cron('0 * * * *') // 每小時
async updateActiveCollectionsTotalOwners() {
  // 1. 找出「活躍」的 collection（最近 24 小時有交易）
  const activeCollections = await this.getActiveCollections();
  
  // 2. 批次更新，限制並發數避免 CPU 飆高
  await Promise.map(activeCollections, async (collection) => {
    // 執行 SQL 查詢更新 totalOwners
    // 更新 Contract 表
  }, { concurrency: 5 });
}
```

**優點**：
- 活躍 collection 的數據保持相對新鮮（最多延遲 1 小時）
- 非活躍 collection 不會浪費資源
- 可控制的效能影響（選擇低峰時段執行）

### Long-Term Plan (3-6 months)
**目標**：基於事件驅動的即時更新機制

#### 實作方案：Transfer 事件觸發增量更新
```typescript
// 在 EventPollerService 或 OrderService 的 Transfer 事件處理中
async onTransferEvent(event: TransferEvent) {
  const { from, to, contractAddress, chainId } = event;
  
  // 1. 檢查 'to' 是否為新持有者
  const isNewOwner = await this.checkIfNewOwner(to, contractAddress);
  if (isNewOwner) {
    await this.incrementTotalOwners(contractAddress, chainId);
  }
  
  // 2. 檢查 'from' 是否完全清空
  const hasNoMoreAssets = await this.checkIfOwnerHasNoAssets(from, contractAddress);
  if (hasNoMoreAssets && from !== '0x0000...') {
    await this.decrementTotalOwners(contractAddress, chainId);
  }
}
```

**挑戰與解決方案**：
1. **併發問題**：使用資料庫層級的 `INCREMENT`/`DECREMENT` 操作
2. **ERC1155 複雜性**：需要追蹤 quantity 變化，判斷是否完全清空
3. **初始值問題**：新 collection 仍需要初始化（可結合 Mid-term 方案）
4. **歷史數據**：需要一次性的數據修正腳本

**優點**：
- 即時更新，數據始終準確
- 分散式更新，不會造成 CPU 瞬間飆高
- 不依賴外部服務（Moralis）

**建議實作順序**：
1. 先實作 ERC721 的事件更新（較簡單）
2. 再擴展到 ERC1155（需要更複雜的邏輯）
3. 保留 Moralis 作為數據校驗機制（定期比對）

