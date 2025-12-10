# 搜索引擎爬蟲檢測功能 - 文件結構

## 📁 文件結構

### 核心文件（已創建）

#### 1. 服務層
```
src/common/services/
└── bot-detection.service.ts          # 核心檢測服務
```

#### 2. 守衛層
```
src/common/guards/
└── bot-detection.guard.ts            # NestJS 守衛
```

#### 3. 裝飾器層
```
src/common/decorators/
└── bot-detection.decorator.ts        # 參數裝飾器
```

#### 4. 中間件層
```
src/common/middleware/
└── bot-detection.middleware.ts       # 全局中間件
```

#### 5. 模塊層
```
src/common/modules/
└── bot-detection.module.ts           # 全局模塊
```

### 已清理的舊文件

以下舊的 Google Bot 相關文件已被清理：
- ❌ `src/common/guards/google-bot.guard.ts`
- ❌ `src/common/services/google-bot-detection.service.ts`
- ❌ `src/common/middleware/google-bot.middleware.ts`
- ❌ `src/common/decorators/google-bot-skip.decorator.ts`
- ❌ `src/common/decorators/skip-google-bot.decorator.ts`

### 已更新的文件

#### 1. AggregatorController
```
src/api/v3/aggregator-api/aggregator.controller.ts
```
- ✅ 使用 `BotDetectionGuard`
- ✅ 使用 `@IsSearchEngineBot()`, `@BotType()`, `@UserAgent()` 裝飾器
- ✅ 保護 `syncOrder` 和 `syncSignatures` 端點

#### 2. CollectionService
```
src/api/v3/collection/collection.service.ts
```
- ✅ 添加 `isSearchEngineBot()` 方法
- ✅ 添加 `getBotType()` 方法
- ✅ 更新 `syncOrder()` 方法支持爬蟲檢測

### 測試文件

#### 1. 測試腳本
```
scripts/
└── test-bot-detection.js             # 爬蟲檢測測試腳本
```

#### 2. 文檔
```
docs/
├── bot-detection-implementation.md   # 實現文檔
└── bot-detection-file-structure.md   # 文件結構文檔
```

## 🔧 使用方法

### 1. 在 Controller 中使用
```typescript
import { BotDetectionGuard } from '@/common/guards/bot-detection.guard';
import { IsSearchEngineBot, BotType, UserAgent } from '@/common/decorators/bot-detection.decorator';

@Post('your-endpoint')
@UseGuards(BotDetectionGuard)
async yourMethod(
  @IsSearchEngineBot() isBot: boolean,
  @BotType() botType: string,
  @UserAgent() userAgent: string,
) {
  if (isBot) {
    return { skipped: true, reason: `${botType} detected` };
  }
  // 正常處理邏輯
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
      return this.botDetection.getSkipResponse(userAgent, 'operation');
    }
    // 正常處理邏輯
  }
}
```

### 3. 全局模塊配置
```typescript
import { BotDetectionModule } from '@/common/modules/bot-detection.module';

@Module({
  imports: [BotDetectionModule],
  // ...
})
export class AppModule {}
```

## ✅ 功能驗證

### 1. 測試腳本
```bash
node scripts/test-bot-detection.js
```

### 2. 檢測能力
- ✅ Google Bot 系列 (7 種)
- ✅ 其他搜索引擎 (8 種)
- ✅ 社交媒體爬蟲 (3 種)
- ✅ 正常用戶識別

### 3. 已保護的端點
- ✅ `POST /api/v3/aggregator/syncOrder`
- ✅ `POST /api/v3/aggregator/os/signatures`
- ✅ `CollectionService.syncOrder()`

## 🚀 部署準備

所有必要的文件都已創建並配置完成：

1. **核心服務**: `BotDetectionService` ✅
2. **守衛**: `BotDetectionGuard` ✅
3. **裝飾器**: 各種參數裝飾器 ✅
4. **中間件**: `BotDetectionMiddleware` ✅
5. **模塊**: `BotDetectionModule` ✅
6. **測試**: 測試腳本和文檔 ✅

系統已經準備就緒，可以立即使用！
