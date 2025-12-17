# Lootex SDK

## Prerequisites

- Node.js >= 18
- A `https://*.lootex.dev` domain if you are developing client-side applications

## Installation

```bash
npm install lootex
```

## Usage Guide

### 1. Create a Lootex Client

First, initialize the Lootex client:

```ts
import { createLootexClient } from '@lootex-core/sdk';

const lootex = createLootexClient({
  environment: 'development',
  apiKey: 'your-api-key', // currently not required
});
```

### 2. Fetch Orders

You can fetch orders using the API client:

```ts
const { orders } = await lootex.apiClient.getOrders({
  chainId: 137,
  limit: 10,
  page: 1,
});
```

### 3. Create an Aggregator

To fulfill orders, create an aggregator instance:

```ts
import { createAggregator } from '@lootex-core/sdk/aggregator';

const aggregator = createAggregator({
  client: lootex,
});
```

### 4. Fulfill Orders

The fulfillment process typically involves multiple steps:

1. Generate the execution plan:

```ts
const execution = await aggregator.fulfillOrders([orders[0]]);
```

2. Handle token approval (if needed):

```ts
const approveTxData = await execution.actions[0].buildTransaction();
const approveTx = await yourWallet.sendTransaction(approveTxData);
// Wait for approval transaction to be confirmed
```

3. Execute the exchange:

```ts
const exchangeTxData = await execution.actions[1].buildTransaction();
const exchangeTx = await yourWallet.sendTransaction(exchangeTxData);
// Wait for exchange transaction to be confirmed
```

Once all transactions are confirmed, the order fulfillment is complete!
