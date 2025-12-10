# Google Bot 檢測功能

## 概述

本功能用於檢測 Google Bot 和其他搜索引擎爬蟲的訪問，並在檢測到時跳過某些數據庫密集型操作，以減少數據庫負載和連接池耗盡問題。

## 功能特點

### 1. 自動檢測
- 檢測 Google Bot 及其變體（Image、News、Video、Desktop、Mobile）
- 檢測其他搜索引擎爬蟲（Bing、Yahoo、DuckDuckGo、Baidu、Yandex）
- 支持複雜的 User Agent 字符串解析

### 2. 智能跳過
- 當檢測到 Google Bot 時，跳過 `aggregator/syncOrder` 操作
- 跳過 `aggregator/os/signatures` 操作
- 跳過其他數據庫密集型操作

### 3. 性能優化
- 減少數據庫連接使用
- 避免長時間運行的查詢
- 提供適當的緩存響應

## 使用方法

### 1. 在 Controller 中使用

```typescript
import { GoogleBotGuard } from '@/common/guards/google-bot.guard';
import { IsGoogleBot, UserAgent } from '@/common/decorators/google-bot-skip.decorator';

@Controller('api/v3')
export class YourController {
  @Post('your-endpoint')
  @UseGuards(GoogleBotGuard)
  async yourMethod(
    @Body() dto: YourDto,
    @IsGoogleBot() isGoogleBot: boolean,
    @UserAgent() userAgent: string,
  ) {
    if (isGoogleBot) {
      return {
        success: false,
        message: 'Skipped for Google Bot',
        reason: 'Google Bot detected, skipping operation to reduce database load'
      };
    }

    // 正常處理邏輯
    return this.yourService.process(dto);
  }
}
```

### 2. 在 Service 中使用

```typescript
import { GoogleBotDetectionService } from '@/common/services/google-bot-detection.service';

@Injectable()
export class YourService {
  constructor(
    private readonly googleBotDetection: GoogleBotDetectionService,
  ) {}

  async processData(userAgent: string, data: any) {
    if (this.googleBotDetection.shouldSkipDatabaseOperations(userAgent)) {
      this.logger.debug('🤖 Google Bot 訪問，跳過數據庫操作');
      return { skipped: true, reason: 'Google Bot detected' };
    }

    // 正常處理邏輯
    return this.performDatabaseOperation(data);
  }
}
```

### 3. 使用裝飾器

```typescript
import { ShouldSkipOperation } from '@/common/decorators/google-bot-skip.decorator';

@Controller('api/v3')
export class YourController {
  @Post('sync-operation')
  async syncOperation(
    @Body() dto: YourDto,
    @ShouldSkipOperation('sync') shouldSkip: boolean,
  ) {
    if (shouldSkip) {
      return { skipped: true, reason: 'Bot detected' };
    }

    // 正常同步邏輯
    return this.syncService.sync(dto);
  }
}
```

## 配置選項

### 1. 檢測模式

```typescript
// 僅檢測 Google Bot
const isGoogleBot = detectionService.isGoogleBotOnly(userAgent);

// 檢測所有搜索引擎爬蟲
const isAnyBot = detectionService.isGoogleBot(userAgent);

// 獲取爬蟲類型
const botType = detectionService.getBotType(userAgent);
```

### 2. 跳過策略

```typescript
// 跳過數據庫操作
const skipDb = detectionService.shouldSkipDatabaseOperations(userAgent);

// 跳過同步操作
const skipSync = detectionService.shouldSkipSyncOperations(userAgent);

// 跳過聚合操作
const skipAggregator = detectionService.shouldSkipAggregatorOperations(userAgent);
```

### 3. 緩存策略

```typescript
// 根據爬蟲類型設置緩存時間
const cacheTime = detectionService.getCacheTimeForBot(userAgent);
// Google Bot: 3600秒 (1小時)
// 其他爬蟲: 1800秒 (30分鐘)
// 正常用戶: 300秒 (5分鐘)
```

## 已實現的端點

### 1. Aggregator Controller
- `POST /api/v3/aggregator/syncOrder` - 跳過 Google Bot 的同步操作
- `POST /api/v3/aggregator/os/signatures` - 跳過 Google Bot 的簽名同步

### 2. Collection Service
- `syncOrder` 方法 - 內部調用時檢測 Google Bot

## 測試

運行測試腳本驗證檢測功能：

```bash
node scripts/test-google-bot-detection.js
```

## 日誌

當檢測到 Google Bot 時，會記錄以下日誌：

```
🤖 檢測到 Google Bot 訪問: POST /api/v3/aggregator/syncOrder - Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)
🤖 Google Bot 訪問 aggregator/syncOrder，跳過同步操作
```

## 性能影響

### 正面影響
- 減少數據庫連接使用
- 避免長時間運行的查詢
- 降低數據庫負載
- 減少連接池耗盡問題

### 負面影響
- 輕微的 User Agent 解析開銷
- 需要額外的檢測邏輯

## 監控

建議監控以下指標：
- Google Bot 訪問頻率
- 跳過的操作數量
- 數據庫連接池使用情況
- 查詢響應時間

## 注意事項

1. **User Agent 偽造**: 某些惡意爬蟲可能偽造 User Agent，但這通常不是問題
2. **正常用戶影響**: 正常用戶不會受到影響
3. **SEO 影響**: 跳過某些操作不會影響 SEO，因為 Google Bot 仍然可以訪問頁面內容
4. **緩存策略**: 為 Google Bot 提供適當的緩存響應

## 擴展

可以輕鬆擴展支持其他類型的爬蟲檢測：

```typescript
const customBotPatterns = [
  /YourCustomBot/i,
  /AnotherBot/i,
];
```

## 故障排除

如果檢測功能不工作：

1. 檢查 User Agent 字符串是否正確傳遞
2. 驗證正則表達式模式
3. 檢查中間件是否正確配置
4. 查看日誌輸出

## 更新日誌

- v1.0.0: 初始實現，支持 Google Bot 檢測
- v1.1.0: 添加其他搜索引擎爬蟲支持
- v1.2.0: 添加緩存策略和性能優化
