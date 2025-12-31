# Lootex Core

[繁體中文](./README.CHINESE.md)

Lootex Core is a high-performance NFT marketplace infrastructure managed with a Monorepo architecture. This project includes a modern frontend based on Next.js and a robust backend API based on NestJS, integrated with blockchain event monitoring and NFT data indexing capabilities.

## 📚 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Database Management](#-database-management)
- [Common Commands](#-common-commands)

## 🚀 Features

The system primarily provides the following core features:

- **NFT Marketplace Protocol**
  - Integrated with **Seaport** protocol for secure and efficient NFT trading.
  - Supports Aggregator architecture.

- **Multi-Chain / Single-Chain Support**
  - Configurable target blockchain via environment variables (e.g., Soneium).
  - Supports custom RPC nodes and block explorer integration.

- **Real-time Data Indexing (Indexer & Poller)**
  - **Event Poller**: Listens to on-chain events to sync NFT transfers and transaction records in real-time.
  - **Metadata Sync**: Integrated with Alchemy and Moralis APIs to automatically update NFT metadata.

- **Account & Authentication System**
  - Supports Web3 wallet login and JWT authentication.
  - Complete User Profile and asset management APIs.

## 🛠 Tech Stack

### Monorepo Management
- **Turborepo**: High-performance build system and task scheduling.
- **pnpm**: Fast and disk-efficient package manager.

### Frontend (apps/client)
- **Framework**: Next.js (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Linting**: Biome / ESLint

### Backend (apps/server)
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Caching**: Redis
- **Message Queue**: AWS SQS (for asset sync and event processing)
- **Blockchain Interaction**: Viem / Wagmi

### Infrastructure
- **Database Migration**: Goose
- **Containerization**: Docker & Docker Compose

## 📂 Project Structure

```
lootex-core/
├── apps/
│   ├── client/          # Next.js Frontend Application
│   └── server/          # NestJS Backend Application (API, Poller, Worker)
├── db/
│   └── migrations/      # SQL Migration Files
├── packages/            # Shared Packages (UI Kit, Utilities, Configs)
├── docker-compose.yml   # Local Development Environment (Postgres, Redis, etc.)
├── package.json         # Root Dependencies and Scripts
└── turbo.json           # Turborepo Configuration
```

## 📋 Prerequisites

Before starting, ensuring you have the following tools installed:

1. **Node.js**: >= 18.0.0
2. **pnpm**: 9.0.0 (Recommended to enable via Corepack: `corepack enable`)
3. **Docker** & **Docker Compose**: For running local database and cache services.
4. **Goose**: Database migration tool (binary installation required).

## ⚡ Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Infrastructure

Before development, start PostgreSQL and other dependent services using Docker:

```bash
docker-compose up -d
```

This command starts a PostgreSQL database (`dex-mainnet`) with default credentials `lootex` / `lootexpassword`.

### 3. Configure Environment Variables

Create `.env` based on the backend example configuration:

```bash
cp apps/server/configs/.env.example apps/server/configs/.env
```

**⚠️ Note:** You must fill in critical environment variables for proper operation, specifically:
- `CHAIN_RPC_URL_MAIN`: Blockchain RPC node URL.
- `ALCHEMY_API_KEY` / `MORAILS_API_KEY`: Third-party data service keys.
- `POSTGRES_*`: Database connection info (no change needed if using default Docker config).

### 4. Run Database Migrations

Ensure the database schema is up to date:

```bash
# Run in the root directory
goose -dir db/migrations postgres "postgres://lootex:lootexpassword@localhost:5432/dex-mainnet?sslmode=disable" up
```

### 5. Start Development Server

Start both frontend and backend:

```bash
pnpm dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001 (default, depends on config)

## ⚙️ Configuration

Main configuration is located in `apps/server/configs/.env`. Key configurations:

| Category | Key Variables | Description |
| --- | --- | --- |
| **Ports** | `PORT`, `QUEUE_PORT` | Ports for API and Worker services |
| **Database** | `POSTGRES_HOST`, `POSTGRES_DATABASE` | PostgreSQL connection settings |
| **Blockchain** | `CHAIN_ID`, `CHAIN_RPC_URL_MAIN` | Target Chain ID and RPC Node |
| **Contracts** | `CHAIN_SEAPORT_ADDRESS` | Seaport protocol contract address |
| **3rd Party** | `ALCHEMY_API_KEY` | Alchemy API Key (for on-chain data) |
| **AWS SQS** | `AWS_SQS_*` | Queue URLs if SQS is enabled |

## 🌐 Chain Migration Guide

When you need to migrate the platform to a new blockchain (e.g., from Soneium to another chain), please follow these best practice steps:

### 1. Update Environment Variables (.env)
Update the following critical information in `apps/server/configs/.env`:
- `CHAIN_ID`: The ID of the new chain.
- `CHAIN_NAME` / `CHAIN_SHORT_NAME`: Identifiers.
- `CHAIN_RPC_URL_MAIN`: RPC node(s) for the new chain (supports comma-separated values).
- `CHAIN_SEAPORT_ADDRESS`: Seaport protocol contract address on the new chain.
- `CHAIN_AGGREGATOR_ADDRESS`: Lootex Aggregator contract address on the new chain.

### 2. Check Connection Config
Ensure the address parsing logic in `apps/server/src/common/utils/chain.config.ts` matches the requirements of the new chain.

### 3. Update Database Seeders
Update default data in `apps/server/src/model/seeders`:
- **Blockchain**: Update the new chain's name, ID, and explorer URL.
- **Currency**: Update the supported native tokens (e.g., ETH, WETH, USDC) and their corresponding addresses for the new chain.

### 4. Replace Contract ABI (Optional)
If the contract versions on the new chain have changed, replace the corresponding ABI files in:
- `packages/sdk/src/[module]/abi.ts` (e.g., `seaport`, `drop`, `swap` modules).

---

## 📦 Database Management

This project uses `goose` for version-controlled database migrations.

- **Create New Migration**:
  ```bash
  goose -dir db/migrations create [migration_name] sql
  ```
- **Run Migrations (Up)**:
  Refer to the command in "Quick Start".
- **Rollback Migration (Down)**:
  ```bash
  goose -dir db/migrations postgres "postgres://lootex:lootexpassword@localhost:5432/dex-mainnet?sslmode=disable" down
  ```

## ⌨️ Common Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start full-stack dev environment (Client + Server) |
| `pnpm build` | Build all projects |
| `pnpm lint` | Run code linting |
| `pnpm format` | Format code with Prettier |
| `pnpm check-types` | Run TypeScript type checking |
| `knip` | Check for unused files and dependencies |

---
*Created by Lootex Team*
