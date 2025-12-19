import { accountAccountFollowProvider } from './account-account-follow.provider';
import { accountAvatarDecorationProvider } from './account-avatar-decoration.provider';
import { accountBadgeProvider } from './account-badge.provider';
import { accountFeaturedAssetProvider } from './account-featured-asset.provider';
import { accountFeaturedProvider } from './account-featured.provider';

import { accountProvider } from './account.provider';
import { accountReferralProvider } from './account-referral.provider';
import { accountSocialTokenProvider } from './account-social-token.provider';

import { assetAsEthAccountProvider } from './asset-as-eth-account.provider';
import { assetExtraProvider } from './asset-extra.provider';
import { assetProvider } from './asset.provider';
import { assetTraitsProvider } from './asset-traits.provider';
import { avatarDecorationProvider } from './avatar-decoration.provider';
import { badgeProvider } from './badge.provider';
import { blockchainProvider } from './blockchain.provider';

import { collectionProvider } from './collection.provider';
import { collectionTradingBoardOneDayProvider } from './collection-trading-board/collection-trading-board-one-day.provider';
import { collectionTradingBoardOneHourProvider } from './collection-trading-board/collection-trading-board-one-hour.provider';
import { collectionTradingBoardOneMonthProvider } from './collection-trading-board/collection-trading-board-one-month.provider';
import { collectionTradingBoardOneWeekProvider } from './collection-trading-board/collection-trading-board-one-week.provider';
import { collectionVolumeAllDaysProvider } from './collection-volume-all-days.provider';
import { contractProvider } from './contract.provider';
import { currencyPriceProvider } from './currency-price-history.provider';
import { currencyProvider } from './currency.provider';
import { ethAccountProvider } from './eth-account.provider';

import { globalValueProvider } from './global-value.provider';
import { lootexNftHolderProvider } from './lootex-nft-holder.provider';
import { pollerProgressLootexAirdropProvider } from './poller-progress-lootex-airdrop.provider';
import { pollerProgressProvider } from './poller-progress.provider';
import { pollerProgressTemporaryProvider } from './poller-progress-temporary.provider';
import { seaportOrderAssetProvider } from './seaport-order-asset.provider';
import { seaportOrderHistoryProvider } from './seaport-order-history.provider';
import { seaportOrderProvider } from './seaport-order.provider';
import { sequelizeProvider } from './sequelize.provider';

import { swapHistoryProvider } from './swap-history.provider';
import { studioContractProvider } from './studio/studio-contract.provider';
import { studioContractDropProvider } from './studio/studio-contract-drop.provider';

import { walletHistoryProvider } from './wallet-history.provider';
import { walletProvider } from './wallet.provider';
import { collectionTradingDataProvider } from './collection-trading-data.provider';
import { tradingRecordLogProvider } from './trading-record-log.provider';
import { biruDiscordWalletProvider } from './biru/biru-discord-wallet.provider';

export * from './account-account-follow.provider';
export * from './account-avatar-decoration.provider';
export * from './account-badge.provider';
export * from './account-featured-asset.provider';
export * from './account-featured.provider';

export * from './account-referral.provider';
export * from './account-rename-log.provider';
export * from './account-social-token.provider';

export * from './account.provider';

export * from './asset-as-eth-account.provider';
export * from './asset-extra.provider';
export * from './asset-traits.provider';
export * from './asset.provider';
export * from './avatar-decoration.provider';
export * from './badge.provider';
export * from './blockchain.provider';

export * from './collection-trading-board/collection-trading-board-one-day.provider';
export * from './collection-trading-board/collection-trading-board-one-hour.provider';
export * from './collection-trading-board/collection-trading-board-one-month.provider';
export * from './collection-trading-board/collection-trading-board-one-week.provider';
export * from './collection-volume-all-days.provider';
export * from './collection.provider';
export * from './contract.provider';
export * from './currency-price-history.provider';
export * from './currency.provider';
export * from './eth-account.provider';

export * from './global-value.provider';
export * from './lootex-nft-holder.provider';
export * from './poller-progress-lootex-airdrop.provider';
export * from './poller-progress-temporary.provider';
export * from './poller-progress.provider';
export * from './seaport-order-asset.provider';
export * from './seaport-order-history.provider';
export * from './seaport-order.provider';
export * from './sequelize.provider';

export * from './swap-history.provider';
export * from './studio/studio-contract.provider';
export * from './studio/studio-contract-drop.provider';

export * from './wallet-history.provider';
export * from './wallet.provider';
export * from './collection-trading-data.provider';
export * from './trading-record-log.provider';
export * from './biru/biru-discord-wallet.provider';

export enum ProviderTokens {
  Account = 'ACCOUNT_REPOSITORY',
  AccountAccountFollow = 'ACCOUNT_ACCOUNT_FOLLOW_REPOSITORY',
  AccountAvatarDecoration = 'ACCOUNT_AVATAR_DECORATION_REPOSITORY',
  AccountBadge = 'ACCOUNT_BADGE_REPOSITORY',
  AccountFeatured = 'ACCOUNT_FEATURED_REPOSITORY',
  AccountFeaturedAsset = 'ACCOUNT_FEATURED_ASSET_REPOSITORY',

  AccountReferral = 'ACCOUNT_REFERRAL_REPOSITORY',
  AccountRenameLog = 'ACCOUNT_RENAME_LOG_REPOSITORY',
  AccountSocialToken = 'ACCOUNT_SOCIAL_TOKEN_REPOSITORY',

  Asset = 'ASSET_REPOSITORY',

  AssetAsEthAccount = 'ASSET_AS_ETH_ACCOUNT_REPOSITORY',
  AssetExtra = 'ASSET_EXTRA_REPOSITORY',
  AssetTraits = 'ASSET_TRAITS_REPOSITORY',
  AvatarDecoration = 'AVATAR_DECORATION_REPOSITORY',
  Badge = 'BADGE_REPOSITORY',
  Blockchain = 'BLOCKCHAIN_REPOSITORY',
  Campaign202212 = 'CAMPAIGN_202212_REPOSITORY',
  Campaign202306Matr1xLottery = 'CAMPAIGN_202306_MATR1X_LOTTERY_REPOSITORY',
  Campaign202306Mission = 'CAMPAIGN_202306_MISSION_REPOSITORY',
  Campaign202306MissionCompleted = 'CAMPAIGN_202306_MISSION_COMPLETED_REPOSITORY',
  Campaign202309MAHLottery = 'CAMPAIGN_202309_MAH_LOTTERY_REPOSITORY',
  Campaign202311MissionCompleted = 'CAMPAIGN_202311_MISSION_COMPLETED_REPOSITORY',
  Campaign202403ComTradeAirdrop = 'CAMPAIGN_202403_COM_TRADE_AIRDROP_REPOSITORY',
  Campaign202403InviteAirdrop = 'CAMPAIGN_202403_INVITE_AIRDROP_REPOSITORY',
  Campaign202411LotterySnapshot = 'CAMPAIGN_202411_LOTTERY_SNAPSHOT_REPOSITORY',
  Campaign202411LotteryStatus = 'CAMPAIGN_202411_LOTTERY_STATUS_REPOSITORY',
  Campaign202411StakeLog = 'CAMPAIGN_202411_STAKE_LOG_REPOSITORY',
  Campaign202411MintLog = 'CAMPAIGN_202411_MINT_LOG_REPOSITORY',
  Collection = 'COLLECTION_REPOSITORY',

  CollectionTradingBoardOneDay = 'COLLECTION_TRADING_BOARD_ONE_DAY_REPOSITORY',
  CollectionTradingBoardOneHour = 'COLLECTION_TRADING_BOARD_ONE_HOUR_REPOSITORY',
  CollectionTradingBoardOneMonth = 'COLLECTION_TRADING_BOARD_ONE_MONTH_REPOSITORY',
  CollectionTradingBoardOneWeek = 'COLLECTION_TRADING_BOARD_ONE_WEEK_REPOSITORY',
  CollectionVolumeAllDays = 'COLLECTION_VOLUME_ALL_DAYS_REPOSITORY',
  Contract = 'CONTRACT_REPOSITORY',
  Currency = 'CURRENCY_REPOSITORY',
  CurrencyPrice = 'CURRENCY_PRICE_HISTORY_REPOSITORY',
  EthAccount = 'ETH_ACCOUNT_REPOSITORY',

  GlobalValue = 'GLOBAL_VALUE_REPOSITORY',
  LootexNftHolder = 'LOOTEX_NFT_HOLDER_REPOSITORY',
  PollerProgress = 'POLLER_PROGRESS_REPOSITORY',
  PollerProgressLootexAirdrop = 'POLLER_PROGRESS_LOOTEX_AIRDROP_REPOSITORY',
  PollerProgressTemporary = 'POLLER_PROGRESS_TEMPORARY_REPOSITORY',
  SeaportOrder = 'SEAPORT_ORDER_REPOSITORY',
  SeaportOrderAsset = 'SEAPORT_ORDER_ASSET_REPOSITORY',
  SeaportOrderHistory = 'SEAPORT_ORDER_HISTORY_REPOSITORY',
  Sequelize = 'SEQUELIZE',

  SwapHistory = 'SWAP_HISTORY_REPOSITORY',
  StudioContract = 'STUDIO_CONTRACT_REPOSITORY',
  StudioContractDrop = 'STUDIO_CONTRACT_DROP_REPOSITORY',

  Wallet = 'WALLET_REPOSITORY',
  WalletHistory = 'WALLET_HISTORY_REPOSITORY',
  CollectionTradingData = 'COLLECTION_TRADING_DATA_REPOSITORY',
  TradingRecordLog = 'TRADING_RECORD_LOG_REPOSITORY',
  BiruDiscordWallet = 'BIRU_DISCORD_WALLET_REPOSITORY',
}

export const providers = [
  accountAccountFollowProvider,
  accountAvatarDecorationProvider,
  accountBadgeProvider,
  accountFeaturedAssetProvider,
  accountFeaturedProvider,

  accountProvider,
  accountReferralProvider,
  accountSocialTokenProvider,

  assetAsEthAccountProvider,
  assetExtraProvider,
  assetProvider,
  assetTraitsProvider,
  avatarDecorationProvider,
  badgeProvider,
  blockchainProvider,

  collectionProvider,
  collectionTradingBoardOneDayProvider,
  collectionTradingBoardOneHourProvider,
  collectionTradingBoardOneMonthProvider,
  collectionTradingBoardOneWeekProvider,
  collectionVolumeAllDaysProvider,
  contractProvider,
  currencyPriceProvider,
  currencyProvider,
  ethAccountProvider,

  globalValueProvider,
  lootexNftHolderProvider,
  pollerProgressLootexAirdropProvider,
  pollerProgressProvider,
  pollerProgressTemporaryProvider,
  seaportOrderAssetProvider,
  seaportOrderHistoryProvider,
  seaportOrderProvider,
  sequelizeProvider,

  swapHistoryProvider,
  studioContractProvider,
  studioContractDropProvider,

  walletHistoryProvider,
  walletProvider,
  collectionTradingDataProvider,
  tradingRecordLogProvider,
  biruDiscordWalletProvider,
];
