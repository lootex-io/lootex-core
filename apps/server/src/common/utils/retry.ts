// 延遲函數，用於等待指定的時間
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 重試函數
export async function retry<T>(
  fn: () => Promise<T>, // 要重試的函數
  retries: number = 3, // 最大重試次數
  delayMs: number = 1000, // 每次重試之間的延遲
): Promise<T> {
  try {
    // 嘗試執行函數
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      // 重試次數已達上限，拋出錯誤
      throw error;
    }
    // 等待指定的時間後重試
    await delay(delayMs);
    // 遞減重試次數並再次調用重試函數
    return retry(fn, retries - 1, delayMs);
  }
}
