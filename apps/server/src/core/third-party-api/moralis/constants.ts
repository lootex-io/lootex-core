import { Chain, ChainMap, MoralisQueryChain } from '@/common/libs/libs.service';
import { QueryFlag } from '../gateway/constants';

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 100; // max by moralis api
export const HTTP_FETCH_BATCH = 5;
export const HTTP_FETCH_DELAY = 300;

export enum MoralisQueryMode {
  SYNC = 'sync',
  ASYNC = 'async',
}

export enum MoralisQueryFlag {
  URI = 'uri',
  METADATA = 'metadata',
}

export enum MoralisQueryFormat {
  DECIMAL = 'decimal',
  HEX = 'hex',
}

export enum Env {
  MORAILS_URL = 'MORAILS_URL',
  MORAILS_API_KEY = 'MORAILS_API_KEY',
  MORAILS_API_BACKUP_KEY = 'MORAILS_API_BACKUP_KEY',

  COVALENT_URL = 'COVALENT_URL',
  COVALENT_API_KEY = 'COVALENT_API_KEY',
  COVALENT_API_BACKUP_KEY = 'COVALENT_API_BACKUP_KEY',

  NFTSCAN_URL = 'NFTSCAN_URL',
  NFTSCAN_API_KEY = 'NFTSCAN_API_KEY',

  TELEGRAM_ALERT_BOT_TOKEN = 'TELEGRAM_ALERT_BOT_TOKEN',
  TELEGRAM_ALERT_CHAT_ID = 'TELEGRAM_ALERT_CHAT_ID',
  S2_IP_COUNT = 'S2_IP_COUNT',
  S2_REFERRAL_COUNT = 'S2_REFERRAL_COUNT',
  S2_RADE_COUNT = 'S2_RADE_COUNT',
}

export const GetChain = (chain: Chain): MoralisQueryChain => {
  return ChainMap[chain].MORALIS;
};

export const queryFlagMap = new Map([
  [QueryFlag.METADATA, MoralisQueryFlag.METADATA],
  [QueryFlag.URI, MoralisQueryFlag.URI],
]);
