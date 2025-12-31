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


export enum QUEUE_ENV {
  QUEUE_OWNER_ASSETS_EXPIRED = 'QUEUE_OWNER_ASSETS_EXPIRED',
  QUEUE_CONTRACT_ASSETS_EXPIRED = 'QUEUE_CONTRACT_ASSETS_EXPIRED',
  QUEUE_ASSET_OWNERS_EXPIRED = 'QUEUE_ASSET_OWNERS_EXPIRED',
  QUEUE_ASSET_METADATA_EXPIRED = 'QUEUE_OWNER_ASSETS_EXPIRED',
}

// ipfs
export const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';

// lootex admin


// for update account assets
export const MAIN_CHAIN_IDS = [
  1, 56, 137, 80001, 42161, 43114, 5000, 8453,
  // 1946,
  1868,
];
export const CONTRACT_ADDRESS_UNKNOWN =
  '0x0000000000000000000000000000000000000000';

export const SERVICE_FEE_ADDRESS = (
  process.env.SERVICE_FEE_ADDRESS || ''
).toLowerCase();

export enum CLOUDWATCH_LOGS {
  CLOUDWATCH_LOGS = 'cloudwatch_logs',
  RPC_EVENT_POLLER = 'rpc_event_poller',
  RPC_SERVICE = 'rpc_service',
  MORALIS = 'moralis',
  COVALENT = 'covalent',
  COMMON = 'common', // default
}

export const NODE_ENV = 'NODE_ENV';
export const NODE_ENV_PRODUCTION = 'production';
export const NODE_ENV_DEVELOPMENT = 'development';



