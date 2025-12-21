# Lootex Core

A monorepo containing the Lootex platform applications.

## Project Structure

This Turborepo includes the following apps:

- `apps/client`: Next.js frontend application
- `apps/server`: NestJS backend application

## Prerequisites

- Node.js >= 18
- pnpm 9.0.0

## Getting Started

Install dependencies:

```sh
pnpm install
```

## Development

Run all apps in development mode:

```sh
pnpm dev
```

Run a specific app:

```sh
# Client only
pnpm dev --filter=@lootex-core/client

# Server only
pnpm dev --filter=@lootex-core/server
```

## Build

Build all apps:

```sh
pnpm build
```

Build a specific app:

```sh
pnpm build --filter=@lootex-core/client
pnpm build --filter=@lootex-core/server
```

## Database Migration
```sh
goose -dir db/migrations postgres "postgres://{app_user}:{app_password}@localhost:5432/dex-mainnet?sslmode=disable" up
```

## Scripts

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps
- `pnpm lint` - Lint all apps
- `pnpm format` - Format code with Prettier
- `pnpm check-types` - Type check all apps

## Tech Stack

- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSql, Goose Migration
