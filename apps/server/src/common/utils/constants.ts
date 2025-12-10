// Page limit restriction
export const RESTRICTED_LIMIT = 30;

// Cache
export const CACHE_EXPIRE_SECONDS = 60 * 1;
export const OWNER_UPDATE_ASSETS_QUEUE = 'owner-update-assets-queue';
export const CONTRACT_UPDATE_ASSETS_QUEUE = 'contract-update-assets-queue';

// Queue
export const QUEUE_OWNER_ASSET_NAME = 'owner-assets';
export const QUEUE_ASSET_METADATA_UPDATE_NAME = 'asset-metadata';
export const QUEUE_CONTRACT_ASSET_NAME = 'contract-assets';
export const QUEUE_ASSET_OWNERS_NAME = 'asset-owners';
export const BUILD_ID_KEY = 'BUILD_ID';
export enum QUEUE_STATUS {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  CONFIRM = 'CONFIRM',
}

export enum ContractType {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  ERC1155 = 'ERC1155',
  UNKNOWN = 'UNKNOWN',
}

export const EMAIL_BLACKLIST = process.env.EMAIL_BLACKLIST
  ? process.env.EMAIL_BLACKLIST.split(',')
  : [];

// Auth
export const UUID_V4_REGEX = new RegExp(
  /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/i,
);
export const DEV_ENVIRONMENT_HOST_REGEX = new RegExp(
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d{1,5})?|lootex\.dev$/,
);
// @dev %c: chainFamily, %a: address
export const AUTH_CHALLENGE_CACHE_KEY_TEMPLATE = 'LOOTEX_ID_CHALLENGE:%c:%a';
export const AUTH_EMAIL_OTP_KEY_TEMPLATE = 'LOOTEX_ID_EMAIL_OTP:%a';
export const AUTH_JWT_COOKIE_KEY = 'lootex_auth';
export const AUTH_APTOS_SIGNUP_MESSAGE = 'Sign Up Lootex ID';
export const AUTH_APTOS_SIGNUP_TEMPLATE = `APTOS\nmessage: ${AUTH_APTOS_SIGNUP_MESSAGE}\nnonce: %c`;
export const AUTH_COOKIE_EXPIRE_DATE = new Date(
  'Thu, 01 Jan 1970 00:00:00 GMT',
);
export const WEB3_SUPPORTED_CHAIN_FAMILIES = ['ETH', 'SOL', 'APTOS', 'FLOW'];

export const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
export const SUPPORT_CHAIN_ID_REGEX =
  /^(1|4|5|56|97|137|80001|43114|43113|42161|421611|5000|5001|8453|84532|1946|1868)$/;
export const ASSET_UPDATE_METADATA_QUEUE_PREFIX =
  'contract-update-metadata-queue';
export const ASSET_UPDATE_OWNERS_QUEUE_PREFIX = 'asset-update-owners-queue';
export const AWS_SQS_WALLET_SUMMARY_URL = 'AWS_SQS_WALLET_SUMMARY_URL';
export const AWS_SQS_ACCOUNT_SUMMARY_URL = 'AWS_SQS_ACCOUNT_SUMMARY_URL';
export const AWS_SQS_AGGREGATOR_EVENT_URL = 'AWS_SQS_AGGREGATOR_EVENT_URL';
export const AWS_SQS_STUDIO_IPFS_SYNC_URL = 'AWS_SQS_STUDIO_IPFS_SYNC_URL';
export const AWS_SQS_TX_TRACKING_URL = 'AWS_SQS_TX_TRACKING_URL';

export enum QUEUE_ENV {
  QUEUE_OWNER_ASSETS_EXPIRED = 'QUEUE_OWNER_ASSETS_EXPIRED',
  QUEUE_CONTRACT_ASSETS_EXPIRED = 'QUEUE_CONTRACT_ASSETS_EXPIRED',
  QUEUE_ASSET_OWNERS_EXPIRED = 'QUEUE_ASSET_OWNERS_EXPIRED',
  QUEUE_ASSET_METADATA_EXPIRED = 'QUEUE_OWNER_ASSETS_EXPIRED',
  QUEUE_WALLET_SUMMARY_EXPIRED = 'QUEUE_WALLET_SUMMARY_EXPIRED',
  QUEUE_ACCOUNT_SUMMARY_EXPIRED = 'QUEUE_ACCOUNT_SUMMARY_EXPIRED',
  QUEUE_AGGREGATOR_EVENT_EXPIRED = 'QUEUE_AGGREGATOR_EVENT_EXPIRED',
  AWS_STUDIO_IPFS_SYNC_EXPIRED = 'AWS_STUDIO_IPFS_SYNC_EXPIRED',
  AWS_TX_TRACKING_EXPIRED = 'AWS_TX_TRACKING_EXPIRED',
}

// ipfs
export const IPFS_GATEWAY = 'https://lootex.mypinata.cloud/ipfs/';

// lootex admin
export const LOOTEX_ADMIN_WALLET = '0x420Cb33bEE2774df6A8D2718DdBcBb57b0fdf3d3';

// Lootex Preset Accounts
export const LOOTEX_PRESET_ACCOUNT_USERNAMES = [
  'zeke_lootex',
  'izzy_lootex',
  'gabe_lootex',
  'mike_lootex',
  'rafe_lootex',
  'jay_lootex',
  'noah_lootex',
  'sol_lootex',
  'eli_lootex',
  'jeremy_lootex',
];

export const LOOTEX_PRESET_ACCOUNT_ADDRESSES = [
  '0x420691c5ca291d74d91c108ca0f434e89bfa02f3',
  '0x42069eab1dd097595b19b6763bfc697e1b5f2db8',
  '0x4206957f3b4aa3667570916e62ad9c95a3ed8045',
  '0x4206971c6fac9372ec10119976435edc2416c397',
  '0x4206904110cd86222e1cc0187fa79a5413d6f54e',
  '0x420695f47fd6e7fcb9d68ecc1a4e8d3cd08dfb53',
  '0x420698b9223a06920eca332f853b1d67ed46cd1a',
  '0x42069cb90c1f94bbba709b6ab386d85f9de94c4f',
  '0x420694fd0c7c5d61fa35c58b1dad629c0fbf81fb',
  '0x4206918ac37324a5c4cd0c55887c4a6ea83e1e37',
];

// for update account assets
export const MAIN_CHAIN_IDS = [
  1, 56, 137, 80001, 42161, 43114, 5000, 8453,
  // 1946,
  1868,
];
export const CONTRACT_ADDRESS_UNKNOWN =
  '0x0000000000000000000000000000000000000000';

export enum CLOUDWATCH_LOGS {
  CLOUDWATCH_LOGS = 'cloudwatch_logs',

  RPC_EVENT_POLLER = 'rpc_event_poller',
  RPC_SERVICE = 'rpc_service',
  MORALIS = 'moralis',
  COVALENT = 'covalent',
  COMMON = 'common', // default
}

// 定义运行环境变量和值
export const NODE_ENV = 'NODE_ENV';
export const NODE_ENV_PRODUCTION = 'production';
export const NODE_ENV_DEVELOPMENT = 'development';

// Game Point
// export const GP_EXCHANGE_LOOT_GP = 'GP_EXCHANGE_LOOT_GP';
// export const GP_EXCHANGE_GP_USD = 'GP_EXCHANGE_GP_USD';

export const SERVICE_FEE_ADDRESS = '0x44bc1e612e11d0acd2c43218ea55717ac28e3a40';
export const SERVICE_FEE_RATE = '2.5';

export const SONEIUM_CONTRACT_ADDRESS =
  '0xcA11bde05977b3631167028862bE2a173976CA11';

export const FORMAT_DATETIME = 'YYYY-MM-DD HH:mm:ss Z';
