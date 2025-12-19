
// Core configuration for the Single Chain setup.
// This allows the user to configure the target chain via .env without modifying code.

export const ActiveChainConfig = {
    id: Number(process.env.CHAIN_ID) || 1868, // Default to Soneium if missing
    name: process.env.CHAIN_NAME || 'soneium', // Enum key correspondence
    shortName: process.env.CHAIN_SHORT_NAME || 'soneium',

    // RPC Configurations
    rpc: {
        main: (process.env.CHAIN_RPC_URL_MAIN || '').split(',').map(s => s.trim()).filter(s => s),
        backup: (process.env.CHAIN_RPC_URL_BACKUP || '').split(',').map(s => s.trim()).filter(s => s),
        eventPoller: (process.env.CHAIN_RPC_URL_EVENT_POLLER || '').split(',').map(s => s.trim()).filter(s => s),
    },

    // Chain properties
    blockTimeMs: Number(process.env.CHAIN_BLOCK_TIME_MS) || 2000,
    currency: {
        symbol: process.env.CHAIN_CURRENCY_SYMBOL || 'ETH',
        decimals: Number(process.env.CHAIN_CURRENCY_DECIMALS) || 18,
    },

    // Contracts
    contracts: {
        seaport: (process.env.CHAIN_SEAPORT_ADDRESS || '').split(',').map(s => s.trim()).filter(s => s),
        aggregator: process.env.CHAIN_AGGREGATOR_ADDRESS || '',
    },

    // URLs
    explorerUrl: process.env.CHAIN_EXPLORER_URL || '',
};
