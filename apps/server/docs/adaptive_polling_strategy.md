# RPC 優化策略：自適應輪詢 (Adaptive Polling)

## 概述
本文件記錄了一項針對 `EventPollerService` 的優化策略，旨在減少 RPC CU (Compute Units) 的消耗，同時維持對鏈上事件的即時響應能力。

目前系統使用 **固定頻率 (Fixed Interval)** 進行輪詢（例如每 10 秒一次）。在鏈上活動低頻（離峰）時段，這會產生大量回傳空值的無效查詢，造成資源浪費。

**自適應輪詢 (Adaptive Polling)** 策略透過動態調整輪詢間隔，在「即時性」與「成本」之間取得平衡。

## 核心邏輯

系統根據 **「上一次輪詢的結果」** 來決定 **「下一次輪詢的等待時間」**。

### 1. 高頻狀態 (High Activity)
- **觸發條件**：當次輪詢抓取到 **1 筆或多筆** 事件 (`events.length > 0`)。
- **推論**：市場熱絡，或特定合約正在發生連續互動（群聚效應）。
- **對策**：**立即重置** 輪詢間隔為 **最小值** (Min Interval)。
- **目的**：確保能以最快速度捕捉後續的連續交易。

### 2. 低頻狀態 (Low Activity)
- **觸發條件**：當次輪詢 **未抓取到任何** 事件 (`events.length === 0`)。
- **推論**：市場冷清，無相關互動。
- **對策**：**逐漸延長** 下一次的輪詢間隔 (Backoff)。
- **公式**：`NextDelay = min(CurrentDelay * Multiplier, MaxInterval)`
- **目的**：減少無效的 RPC 呼叫，節省 CU。

## 參數設定建議

| 參數 | 說明 | 建議值 (L2) | 建議值 (L1) |
| :--- | :--- | :--- | :--- |
| **Min Interval** | 最小輪詢間隔 (即時性要求) | 10s | 60s |
| **Max Interval** | 最大輪詢間隔 (容忍的最長延遲) | 60s | 300s (5min) |
| **Backoff Multiplier** | 延遲增長倍率 | 1.5x | 1.5x |

### 範例行為 (L2 鏈)
假設 Min=10s, Max=60s, Multiplier=1.5x。

1.  **T0**: 輪詢 (結果: 無事件) -> 下次等待 **15s** (10 * 1.5)
2.  **T15**: 輪詢 (結果: 無事件) -> 下次等待 **22.5s** (15 * 1.5)
3.  **T37.5**: 輪詢 (結果: 無事件) -> 下次等待 **33.75s**
4.  **T71.25**: 輪詢 (結果: 無事件) -> 下次等待 **50.625s**
5.  **T121.8**: 輪詢 (結果: 無事件) -> 下次等待 **60s** (達到上限)
6.  ...維持 60s 輪詢...
7.  **Tx**: 輪詢 (結果: **有事件!**) -> 下次等待 **10s** (立即重置)

## 優缺點分析

### 優點
1.  **節省成本**：在離峰時段可減少高達 80% 的 RPC 請求 (視 Max Interval 而定)。
2.  **自動適應**：無需人工定義尖峰/離峰時段，系統自動根據鏈上狀況調整。
3.  **實作簡單**：僅需修改輪詢迴圈邏輯，無需更動基礎架構 (如 WebSocket)。

### 缺點與權衡 (Trade-off)
1.  **喚醒延遲 (Wake-up Latency)**：
    -   當系統處於「最長睡眠模式」(Max Interval) 時，若發生第一筆交易，系統捕捉到的時間會比固定頻率慢。
    -   **最大延遲增加量** = `Max Interval - Min Interval`。
    -   *緩解方式*：設定合理的 `Max Interval` (例如 1 分鐘)，確保延遲在可接受範圍內。

## 實作參考 (Pseudo Code)

```typescript
async function schedulePoll(currentDelay) {
  setTimeout(async () => {
    const events = await getEvents();

    let nextDelay;
    if (events.length > 0) {
      // 有事件：重置為最小間隔
      nextDelay = MIN_INTERVAL;
    } else {
      // 無事件：指數退避 (Exponential Backoff)
      nextDelay = Math.min(currentDelay * BACKOFF_MULTIPLIER, MAX_INTERVAL);
    }

    schedulePoll(nextDelay);
  }, currentDelay);
}
```

## 進階機制：追趕模式 (Catch-up Mode)

當系統從長睡眠 (Max Interval) 醒來時，累積的區塊數量可能超過單次 RPC 允許的 `PollingBatch`。

**問題**：若 Base 鏈睡了 60s 累積 30 個區塊，但 Batch 限制 25 個。
**解法**：在輪詢結束時檢查 `toBlock < latestBlock`。
- 若 **是**：代表還有未處理的區塊，**忽略 Backoff，立即 (0ms) 進行下一次輪詢**。
- 若 **否**：代表已追上最新進度，才執行 Backoff 判斷。

這確保了系統在喚醒後能進入 **「全速運轉 (Burst Mode)」**，直到消化完所有累積區塊。

## 關於「雙掃描線 (Dual Scan)」的可行性分析

**提案構想**：
長時間休眠喚醒後，同時啟動兩個執行緒：
1.  **Forward Scanner**: 從 `Current Block` 往後抓 (處理舊資料)。
2.  **Backward Scanner**: 從 `Latest Block` 往回抓 (優先確認最新狀態)。

**分析評估**：
1.  **優點**：能更快確認「最新一刻」是否有交易，理論上能將喚醒延遲降到最低。
2.  **缺點與風險**：
    -   **資料庫寫入衝突 (Race Condition)**：兩個 Scanner 若同時寫入 DB 或更新 `LastPolledBlock`，需要複雜的鎖定機制 (Locking) 來避免資料錯亂或重複處理。
    -   **狀態管理複雜化**：目前的 `PollerProgress` 僅記錄單一 `lastPolledBlock`。若改為雙向，需記錄「已處理區間 (Range)」，例如 `[100-125]` 和 `[150-155]`，中間會有缺口 (Gap)，系統需有能力填補缺口。
    -   **RPC 成本增加**：同時發起兩個 Request，若兩個區間都沒資料，反而浪費雙倍 CU。

**結論**：
考量到實作複雜度與資料一致性風險，**「單一掃描線 + 追趕模式 (Burst Mode)」** 是 CP 值較高的作法。因為在 `PollingBatch` 足夠大 (例如 25-100) 的情況下，追趕 30-50 個區塊通常只需額外 1-2 次 RPC，時間差僅在毫秒級，雙掃描線帶來的效益有限。

## 掃描方向的影響：從前往後 (Forward) vs 從後往前 (Backward)

在單一掃描線的前提下，掃描方向的選擇至關重要。

### 1. 從前往後 (Forward Scan) - ✅ 推薦
- **邏輯**：`Block 100 -> 101 -> 102 ...`
- **優點**：符合事件發生的**因果順序 (Causality)**。
    - 先有 `OrderCreated` (Block 100)，才有 `OrderCancelled` (Block 105)。
    - 系統依序處理，資料庫狀態轉換自然且正確 (Created -> Cancelled)。
- **缺點**：若落後太多，需要追趕完舊區塊才能看到最新狀態。

### 2. 從後往前 (Backward Scan) - ❌ 不推薦
- **邏輯**：`Block 105 -> 104 -> 103 ...`
- **致命傷**：**逆轉因果**。
    - 系統會先看到 `OrderCancelled` (Block 105)。
    - 此時資料庫根本沒有這張訂單 (因為 `OrderCreated` 在 Block 100 還沒掃到)。
    - **結果**：更新失敗，或被迫建立一個「只有取消狀態、沒有訂單內容」的幽靈訂單，導致資料不一致。

**總結**：
對於依賴狀態變化的系統（如訂單系統），**必須** 採用 **Forward Scan** 以確保資料的一致性與邏輯正確性。Backward Scan 僅適用於「無狀態 (Stateless)」的統計數據收集（例如只算交易量，不看訂單狀態）。
