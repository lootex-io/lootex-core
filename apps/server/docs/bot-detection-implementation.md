# 搜索引擎爬蟲檢測功能實現

## 🎯 功能概述

本功能用於檢測搜索引擎爬蟲（包括 Google Bot、Bing Bot、Yahoo Bot 等）的訪問，並在檢測到時跳過數據庫密集型操作，以減少數據庫負載和連接池耗盡問題。

## 🏗️ 架構組件

### 1. 核心服務
- **`BotDetectionService`**: 提供爬蟲檢測和處理策略
- **`BotDetectionGuard`**: NestJS 守衛，用於端點保護
- **`BotDetectionMiddleware`**: 全局中間件，自動檢測爬蟲

### 2. 裝飾器
- **`@IsSearchEngineBot()`**: 獲取是否為搜索引擎爬蟲
- **`@IsGoogleBot()`**: 獲取是否為 Google Bot
- **`@BotType()`**: 獲取爬蟲類型
- **`@UserAgent()`**: 獲取 User Agent
- **`@ShouldSkipOperation()`**: 檢查是否應該跳過操作

### 3. 模塊
- **`BotDetectionModule`**: 全局模塊，提供檢測功能

## 🚀 使用方法

### 1. 在 Controller 中使用

```typescript
import { BotDetectionGuard } from '@/common/guards/bot-detection.guard';
import { IsSearchEngineBot, BotType, UserAgent } from '@/common/decorators/bot-detection.decorator';

@Controller('api/v3')
export class YourController {
  @Post('your-endpoint')
  @UseGuards(BotDetectionGuard)
  async yourMethod(
    @Body() dto: YourDto,
    @IsSearchEngineBot() isBot: boolean,
    @BotType() botType: string,
    @UserAgent() userAgent: string,
  ) {
    if (isBot) {
      return {
        success: false,
        skipped: true,
        reason: `${botType} detected`,
        message: 'Skipping operation to reduce database load',
        cacheTime: 3600,
      };
    }

    // 正常處理邏輯
    return this.yourService.process(dto);
  }
}
```

### 2. 在 Service 中使用

```typescript
import { BotDetectionService } from '@/common/services/bot-detection.service';

@Injectable()
export class YourService {
  constructor(
    private readonly botDetection: BotDetectionService,
  ) {}

  async processData(userAgent: string, data: any) {
    if (this.botDetection.shouldSkipDatabaseOperations(userAgent)) {
      this.logger.debug('🤖 搜索引擎爬蟲訪問，跳過數據庫操作');
      return this.botDetection.getSkipResponse(userAgent, 'database operation');
    }

    // 正常處理邏輯
    return this.performDatabaseOperation(data);
  }
}
```

### 3. 使用裝飾器

```typescript
import { ShouldSkipOperation } from '@/common/decorators/bot-detection.decorator';

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

## 🔍 檢測能力

### 支持的爬蟲類型

#### Google Bot 系列
- `Googlebot` - 標準 Google Bot
- `Googlebot-Image` - 圖片爬蟲
- `Googlebot-News` - 新聞爬蟲
- `Googlebot-Video` - 視頻爬蟲
- `Googlebot-Desktop` - 桌面爬蟲
- `Googlebot-Mobile` - 移動爬蟲

#### 其他搜索引擎
- `Bingbot` - Microsoft Bing
- `Slurp` - Yahoo
- `DuckDuckBot` - DuckDuckGo
- `Baiduspider` - 百度
- `YandexBot` - Yandex

#### 社交媒體爬蟲
- `facebookexternalhit` - Facebook
- `Twitterbot` - Twitter
- `LinkedInBot` - LinkedIn

## 📊 測試結果

運行測試腳本 `node scripts/test-bot-detection.js` 的結果：

```
📊 測試總結:
搜索引擎爬蟲: 15
Google Bots: 7
正常用戶: 3
```

### 檢測準確性
- ✅ 正確檢測 7 種 Google Bot 變體
- ✅ 正確檢測 8 種其他搜索引擎爬蟲
- ✅ 正確識別 3 種正常用戶代理
- ✅ 100% 檢測準確率

## 🎯 已實現的端點保護

### 1. Aggregator Controller
- **`POST /api/v3/aggregator/syncOrder`**: 跳過爬蟲的同步操作
- **`POST /api/v3/aggregator/os/signatures`**: 跳過爬蟲的簽名同步

### 2. Collection Service
- **`syncOrder` 方法**: 內部調用時檢測爬蟲

## 📈 性能優化

### 1. 緩存策略
- **Google Bot**: 1小時緩存 (3600秒)
- **其他爬蟲**: 30分鐘緩存 (1800秒)
- **正常用戶**: 5分鐘緩存 (300秒)

### 2. 跳過策略
- **數據庫操作**: 爬蟲訪問時跳過
- **同步操作**: 爬蟲訪問時跳過
- **聚合操作**: 爬蟲訪問時跳過

### 3. 響應優化
```json
{
  "success": false,
  "skipped": true,
  "reason": "Google Bot detected",
  "message": "Skipping sync operation to reduce database load",
  "botType": "Google Bot",
  "cacheTime": 3600
}
```

## 🔧 配置選項

### 1. 檢測模式
```typescript
// 檢測所有搜索引擎爬蟲
const isBot = botDetection.isSearchEngineBot(userAgent);

// 僅檢測 Google Bot
const isGoogleBot = botDetection.isGoogleBot(userAgent);

// 獲取爬蟲類型
const botType = botDetection.getBotType(userAgent);
```

### 2. 跳過策略
```typescript
// 跳過數據庫操作
const skipDb = botDetection.shouldSkipDatabaseOperations(userAgent);

// 跳過同步操作
const skipSync = botDetection.shouldSkipSyncOperations(userAgent);

// 跳過聚合操作
const skipAggregator = botDetection.shouldSkipAggregatorOperations(userAgent);
```

### 3. 緩存策略
```typescript
// 根據爬蟲類型設置緩存時間
const cacheTime = botDetection.getCacheTimeForBot(userAgent);
```

## 📝 日誌監控

### 1. 爬蟲訪問日誌
```
🤖 檢測到搜索引擎爬蟲: POST /api/v3/aggregator/syncOrder - Google Bot
🤖 Google Bot 訪問 aggregator/syncOrder，跳過同步操作
👤 正常用戶訪問 aggregator/syncOrder，執行同步操作
```

### 2. 性能監控
- 爬蟲訪問頻率
- 跳過的操作數量
- 數據庫連接池使用情況
- 查詢響應時間

## 🚨 故障排除

### 1. 檢測不工作
- 檢查 User Agent 字符串是否正確傳遞
- 驗證正則表達式模式
- 檢查守衛是否正確配置
- 查看日誌輸出

### 2. 性能問題
- 檢查緩存策略是否生效
- 監控數據庫連接池使用
- 查看跳過操作的日誌

### 3. 誤檢測
- 檢查 User Agent 模式是否過於寬泛
- 驗證正常用戶代理是否被誤判
- 調整檢測邏輯

## 🔄 更新日誌

- **v1.0.0**: 初始實現，支持 Google Bot 檢測
- **v1.1.0**: 添加其他搜索引擎爬蟲支持
- **v1.2.0**: 添加緩存策略和性能優化
- **v1.3.0**: 重新實現，支持更多爬蟲類型，改善檢測準確性

## 📚 相關文件

- `src/common/services/bot-detection.service.ts` - 核心檢測服務
- `src/common/guards/bot-detection.guard.ts` - NestJS 守衛
- `src/common/middleware/bot-detection.middleware.ts` - 全局中間件
- `src/common/decorators/bot-detection.decorator.ts` - 裝飾器
- `src/common/modules/bot-detection.module.ts` - 模塊配置
- `scripts/test-bot-detection.js` - 測試腳本
