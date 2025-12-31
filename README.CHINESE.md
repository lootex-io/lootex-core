# Lootex Core

[English](./README.md)

Lootex Core 是一個高效能的 NFT 交易平台基礎架構，採用 Monorepo 架構管理前端與後端應用。本專案包含了一個基於 Next.js 的現代化前端以及基於 NestJS 的強大後端 API，並整合了區塊鏈事件監聽與 NFT 數據索引功能。

## 📚 目錄

- [功能特色](#-功能特色)
- [技術架構](#-技術架構)
- [專案結構](#-專案結構)
- [事前準備](#-事前準備)
- [快速開始](#-快速開始)
- [環境變數設定](#-環境變數設定)
- [資料庫管理](#-資料庫管理)
- [常用指令](#-常用指令)

## 🚀 功能特色

本系統主要提供以下核心功能：

- **NFT 市場交易協議**
  - 整合 **Seaport** 協議，支援安全且高效的 NFT 交易。
  - 支援聚合器架構 (Aggregator)。


- **多鏈/單鏈支援**
  - 可透過環境變數配置目標區塊鏈（目前範例配置為 Soneium）。
  - 支援自定義 RPC 節點與區塊瀏覽器整合。

- **即時數據索引 (Indexer & Poller)**
  - **Event Poller**：監聽鏈上事件，即時同步 NFT 轉移與交易紀錄。
  - **Metadata Sync**：整合 Alchemy 與 Moralis API，自動更新 NFT 元數據。

- **帳戶與認證系統**
  - 支援 Web3 錢包登入與 JWT 身份驗證。
  - 完整的 User Profile 與資產管理 API。

## 🛠 技術架構

### Monorepo 管理
- **Turborepo**: 高效的建置系統與任務排程。
- **pnpm**: 快速且節省磁碟空間的套件管理器。

### 前端 (apps/client)
- **Framework**: Next.js (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Linting**: Biome / ESLint

### 後端 (apps/server)
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Caching**: Redis
- **Message Queue**: AWS SQS (用於資產同步與事件處理)
- **Blockchain Interaction**: Viem / Ethers.js

### 基礎設施
- **Database Migration**: Goose
- **Containerization**: Docker & Docker Compose

## 📂 專案結構

```
lootex-core/
├── apps/
│   ├── client/          # Next.js 前端應用
│   └── server/          # NestJS 後端應用 (API, Poller, Worker)
├── db/
│   └── migrations/      # SQL 資料庫遷移檔案
├── packages/            # 共用套件 (UI Kit, Utilities, Configs)
├── docker-compose.yml   # 本地開發環境 (Postgres, Redis 等)
├── package.json         # 專案根目錄依賴與腳本
└── turbo.json           # Turborepo 設定
```

## 📋 事前準備

在開始之前，請確保您的環境已安裝以下工具：

1. **Node.js**: >= 18.0.0
2. **pnpm**: 9.0.0 (建議使用 Corepack 啟用: `corepack enable`)
3. **Docker** & **Docker Compose**: 用於運行本地資料庫與快取服務。
4. **Goose**: 用於執行資料庫遷移工具 (需安裝 binary)。

## ⚡ 快速開始

### 1. 安裝依賴

```bash
pnpm install
```

### 2. 啟動基礎設施

在開發之前，請先使用 Docker 啟動 PostgreSQL 與其他依賴服務：

```bash
docker-compose up -d
```

此指令會啟動一個 PostgreSQL 資料庫 (`dex-mainnet`)，帳號密碼預設為 `lootex` / `lootexpassword`。

### 3. 設定環境變數

請參考後端範例設定檔並建立 `.env`：

```bash
cp apps/server/configs/.env.example apps/server/configs/.env
```

**⚠️ 注意：** 您需要填入關鍵的環境變數才能正常運行，特別是：
- `CHAIN_RPC_URL_MAIN`: 區塊鏈 RPC 節點 URL。
- `ALCHEMY_API_KEY` / `MORAILS_API_KEY`: 第三方數據服務金鑰。
- `POSTGRES_*`: 資料庫連線資訊（若使用預設 Docker 設定則無需修改）。

### 4. 執行資料庫遷移

確保資料庫 schema 是最新的：

```bash
# 在根目錄執行
goose -dir db/migrations postgres "postgres://lootex:lootexpassword@localhost:5432/dex-mainnet?sslmode=disable" up
```

### 5. 啟動開發伺服器

同時啟動前端與後端：

```bash
pnpm dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001 (預設，視配置而定)

## ⚙️ 環境變數設定

主要配置位於 `apps/server/configs/.env`。以下是關鍵配置說明：

| 變數類別 | 關鍵變數 | 說明 |
| --- | --- | --- |
| **服務埠口** | `PORT`, `QUEUE_PORT` | API 與 Worker 服務運行的 Port |
| **資料庫** | `POSTGRES_HOST`, `POSTGRES_DATABASE` | PostgreSQL 連線設定 |
| **區塊鏈設定** | `CHAIN_ID`, `CHAIN_RPC_URL_MAIN` | 目標鏈 ID 與 RPC 節點 |
| **合約地址** | `CHAIN_SEAPORT_ADDRESS` | Seaport 協議合約地址 |
| **第三方服務** | `ALCHEMY_API_KEY` | Alchemy API Key (用於讀取鏈上數據) |
| **AWS SQS** | `AWS_SQS_*` | 如果啟用 SQS 功能，需設定對應 Queue URL |

## 🌐 鏈遷移指引 (Chain Migration Guide)

當您需要將平台遷移至新的區塊鏈（例如從 Soneium 搬到其他鏈）時，請參考以下最佳實踐步驟：

### 1. 更新環境變數 (.env)
在 `apps/server/configs/.env` 中更新以下關鍵資訊：
- `CHAIN_ID`: 新鏈的 ID。
- `CHAIN_NAME` / `CHAIN_SHORT_NAME`: 識別名稱。
- `CHAIN_RPC_URL_MAIN`: 新鏈的 RPC 節點（支援以逗號分隔多個節點）。
- `CHAIN_SEAPORT_ADDRESS`: Seaport 協議在新鏈上的合約地址。
- `CHAIN_AGGREGATOR_ADDRESS`: Lootex 聚合器在新鏈上的合約地址。

### 2. 檢查連線配置
確認 `apps/server/src/common/utils/chain.config.ts` 中的位址格式解析邏輯與新鏈需求相符。

### 3. 更新資料庫 Seeders
在 `apps/server/src/model/seeders` 中更新預設支援的資料：
- **Blockchain**: 更新新鏈的名稱、ID 與瀏覽器位址。
- **Currency**: 更新新鏈支援的原生代幣（如 ETH, WETH, USDC）與其對應地址。

### 4. 替換合約 ABI (選用)
若新鏈使用的合約版本有所變動，請在以下位置替換對應的 ABI 檔案：
- `packages/sdk/src/[module]/abi.ts` (例如 `seaport`, `drop`, `swap` 等模組)。

---

## 📦 資料庫管理

本專案使用 `goose` 進行版本控制的資料庫遷移。

- **建立新遷移**:
  ```bash
  goose -dir db/migrations create [migration_name] sql
  ```
- **執行遷移 (Up)**:
  請參考「快速開始」中的指令。
- **回滾遷移 (Down)**:
  ```bash
  goose -dir db/migrations postgres "postgres://lootex:lootexpassword@localhost:5432/dex-mainnet?sslmode=disable" down
  ```

## ⌨️ 常用指令

| 指令 | 說明 |
| --- | --- |
| `pnpm dev` | 啟動全端開發環境 (Client + Server) |
| `pnpm build` | 建置所有專案 |
| `pnpm lint` | 執行程式碼檢查/排版檢查 |
| `pnpm format` | 使用 Prettier 格式化程式碼 |
| `pnpm check-types` | 執行 TypeScript 型別檢查 |
| `knip` | 檢查未使用的檔案與依賴 |

---
*Created by Lootex Team*
