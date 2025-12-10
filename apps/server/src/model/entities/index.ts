import { Account } from './account.entity';
import { AccountAccountFollow } from './account-account-follow.entity';
import { AccountAvatarDecoration } from './account-avatar-decoration.entity';
import { AccountBadge } from './account-badge.entity';
import { AccountChainSummary } from '@/model/entities/account-chain-summary.entity';
import { AccountChainSummaryStats } from '@/model/entities/account-chain-summary-stats.entity';
import { AccountFeatured } from './account-featured.entity';
import { AccountFeaturedAsset } from './account-featured-asset.entity';
import { AccountGpBalance } from '@/model/entities/gp/account-gp-balance.entitiy';
import { AccountGpBalanceHistory } from '@/model/entities/gp/account-gp-balance-history.entity';
import { AccountGpQuest } from '@/model/entities/gp/account-gp-quest.entity';
import { AccountGpQuestCompleted } from '@/model/entities/gp/account-gp-quest_completed.entity';

import { AccountReferral } from './account-referral.entity';
import { AccountRenameLog } from './account-rename-log.entity';
import { AccountSocialToken } from './account-social-token.entity';

import { AggregatorOpenSeaCollection } from '@/model/entities/aggregator/aggregator-watched-collection';
import { AggregatorOpenSeaRepairLog } from '@/model/entities/aggregator/aggregator-opensea-repair-log';
import { AggregatorWssProgress } from '@/model/entities/aggregator/aggregator-wss-progress';
import { Asset } from './asset.entity';

import { AssetAsEthAccount } from './asset-as-eth-account.entity';
import { AssetExtra } from './asset-extra.entity';
import { AssetTraits } from './asset-traits.entity';
import { AvatarDecoration } from './avatar-decoration.entity';
import { Badge } from './badge.entity';
import { Blockchain } from './blockchain.entity';
import { Collection } from './collection.entity';

import { CollectionTradingBoardOneDay } from './collection-trading-board/collection-trading-board-one-day.entity';
import { CollectionTradingBoardOneHour } from './collection-trading-board/collection-trading-board-one-hour.entity';
import { CollectionTradingBoardOneMonth } from './collection-trading-board/collection-trading-board-one-month.entity';
import { CollectionTradingBoardOneWeek } from './collection-trading-board/collection-trading-board-one-week.entity';
import { CollectionVolumeAllDays } from './collection-volume-all-days.entity';
import { CollectionVolumeSevenDays } from './collection-volume-seven-days.entity';
import { CollectionVolumeThirtyDays } from './collection-volume-thirty-days.entity';
import { CollectionVolumeToday } from './collection-volume-today.entity';
import { Contract } from './contract.entity';
import { Currency } from './currency.entity';
import { CurrencyPriceHistory } from './currency-price-history.entity';
import { EthAccount } from './eth-account.entity';
import { EventRpcLog } from '@/model/entities/event-rpc-log.entity';
import { EventWssProgress } from '@/model/entities/event-wss-progress.entity';

import { GlobalValue } from './global-value.entity';
import { ImportCollectionErrorLog } from '@/model/entities/import-collection-error-log.entity';
import { ImportCollectionLog } from '@/model/entities/import-collection-log.entity';
import { LootexAirdropEvent } from './lootex_airdrop_event.entity';
import { LootexAirdropHistory } from './lootex_airdrop_history.entity';
import { LootexNftHolder } from './lootex-nft-holder.entity';
import { MonitorAlertChannel } from '@/model/entities/monitor-alert-channel.entity';
import { NumberTraits } from './number-traits.entity';
import { PollerProgress } from './poller-progress.entity';
import { PollerProgressLootexAirdrop } from './poller-progress-lootex-airdrop.entity';
import { PollerProgressProject } from '@/model/entities/poller-progress-project.entity';
import { PollerProgressTemporary } from './poller-progress-temporary.entity';
import { ReportLog } from '@/model/entities/report-log.entity';
import { SeaportOrder } from './seaport-order.entity';
import { SeaportOrderAsset } from './seaport-order-asset.entity';
import { SeaportOrderHistory } from './seaport-order-history.entity';

import { StringTraits } from './string-traits.entity';
import { StudioContract } from './studio/studio-contract.entity';
import { StudioContractDrop } from './studio/studio-contract-drop.entity';
import { StudioContractItemMetadata } from './studio/studio-contract-item-metadata.entity';
import { SwapHistory } from './swap-history.entity';

import { Wallet } from './wallet.entity';
import { WalletHistory } from '@/model/entities/wallet-history.entity';
import { WalletNftSummary } from '@/model/entities/wallet-nft-summary.entity';
import { WalletSummary } from '@/model/entities/wallet-summary.entity';
import { StudioContractUploadItem } from '@/model/entities/studio/studio-contract-upload-item.entity';
import { CollectionTradingData } from './collection-trading-data.entity';
import { TradingRecordLog } from './trading-record-log.entity';
import { GpPool } from '@/model/entities/gp/gp-pool.entity';
import { GpPoolHistory } from '@/model/entities/gp/gp-pool-history.entity';
import { TradeRewardRule } from '@/model/entities/trade-reward/trade-reward-rule.entity';
import { TradeRewardStats } from '@/model/entities/trade-reward/trade-reward-stats.entity';
import { TradeRewardHistory } from '@/model/entities/trade-reward/trade-reward-history.entity';
import { SdkApiKey } from '@/model/entities/sdk/sdk-api-key.entity';
import { AccountGpExpiry } from '@/model/entities/gp/account-gp-expiry.entity';
import { SdkGalxeLog } from '@/model/entities/sdk/sdk-galxe-log.entity';
import { BiruPoint } from '@/model/entities/biru/biru-point.entity';
import { BiruPointHistory } from '@/model/entities/biru/biru-point-history.entity';
import { BiruCollection } from '@/model/entities/biru/biru-collection.entity';
import { BiruDiscordWallet } from '@/model/entities/biru/biru-wallet-discord.entity';
import { BiruSeason } from '@/model/entities/biru/biru-season.entity';
import { BiruEverMoonCollection } from '@/model/entities/biru/evermoon/biru-evermoon-collection.entity';
import { BiruEverMoonHistory } from '@/model/entities/biru/evermoon/biru-evermoon-history.entity';
import { StakeParams } from '@/model/entities/stake/stake-params.entity';
import { StakeWalletBeer } from '@/model/entities/stake/stake-wallet-beer.entity';
import { StakeNftBeerHistory } from '@/model/entities/stake/stake-nft-beer-history';
import { StakeWalletClaimHistory } from '@/model/entities/stake/stake-wallet-claim-history.entity';
import { StakeBeerSyncHistory } from '@/model/entities/stake/stake-beer-sync-history.entity';
import { StakeNft } from '@/model/entities/stake/stake-nft.entity';
import { StakeNftHistory } from '@/model/entities/stake/stake-nft-history.entity';
import { StakeCollection } from '@/model/entities/stake/stake-colleciton.entity';
import { StakeSeason } from '@/model/entities/stake/stake-session.entity';
import { StakeWalletStats } from '@/model/entities/stake/stake-wallet-stats.entity';
import { StoreProduct } from '@/model/entities/biru/store/store-product.entity';
import { StoreCollection } from '@/model/entities/biru/store/store-collection.entity';
import { StoreGameCode } from '@/model/entities/biru/store/store-game-code.entity';
import { StoreMintedNft } from '@/model/entities/biru/store/store-minted-nft.entity';
import { StoreRedemption } from '@/model/entities/biru/store/store-redemption.entity';
import { StoreBeerHistory } from '@/model/entities/biru/store/store-beer-history.entity';
import { FizzpopUser } from './biru/fizzpop/fizzpop-user.entity';
import { FizzpopGameInfo } from './biru/fizzpop/fizzpop-game-info.entity';
import { FizzpopUserGameLog } from './biru/fizzpop/fizzpop-user-game-log.entity';
import { FizzpopUserEnergy } from './biru/fizzpop/fizzpop-user-energy.entity';
import { FizzpopUserEnergyLog } from './biru/fizzpop/fizzpop-user-energy-log.entity';
import { FizzpopWalletList } from '@/model/entities/biru/fizzpop/fizzpop-wallet-list.entity';
import { FizzpopSeason } from './biru/fizzpop/fizzpop-season.entity';
import { FizzpopUserStatistics } from './biru/fizzpop/fizzpop-user-statistics.entity';
import { FizzpopUserSeasonBestGameLog } from './biru/fizzpop/fizzpop-user-season-best-game-log.entity';
import { FizzpopIngameStoreItem } from './biru/fizzpop/fizzpop-ingame-store-item.entity';
import { FizzpopUserBuyIngameItemLog } from './biru/fizzpop/fizzpop-user-buy-ingame-item-log.entity';

export * from './account-account-follow.entity';
export * from './account-avatar-decoration.entity';
export * from './account-badge.entity';
export * from './account-featured-asset.entity';
export * from './account-featured.entity';

export * from './account-referral.entity';
export * from './account-rename-log.entity';
export * from './account-social-token.entity';

export * from './account.entity';

export * from './asset-as-eth-account.entity';
export * from './asset-extra.entity';
export * from './asset-traits.entity';
export * from './asset.entity';
export * from './avatar-decoration.entity';
export * from './badge.entity';
export * from './blockchain.entity';

export * from './collection-trading-board/collection-trading-board-one-day.entity';
export * from './collection-trading-board/collection-trading-board-one-hour.entity';
export * from './collection-trading-board/collection-trading-board-one-month.entity';
export * from './collection-trading-board/collection-trading-board-one-week.entity';
export * from './collection-volume-all-days.entity';
export * from './collection-volume-seven-days.entity';
export * from './collection-volume-thirty-days.entity';
export * from './collection-volume-today.entity';
export * from './collection.entity';
export * from './contract.entity';
export * from './currency-price-history.entity';
export * from './currency.entity';
export * from './eth-account.entity';

export * from './global-value.entity';
export * from './lootex-nft-holder.entity';
export * from './lootex_airdrop_event.entity';
export * from './lootex_airdrop_history.entity';
export * from './number-traits.entity';
export * from './poller-progress-lootex-airdrop.entity';
export * from './poller-progress-temporary.entity';
export * from './poller-progress.entity';
export * from './seaport-order-asset.entity';
export * from './seaport-order-history.entity';
export * from './seaport-order.entity';

export * from './string-traits.entity';
export * from './studio/studio-contract-drop.entity';
export * from './studio/studio-contract.entity';
export * from './swap-history.entity';

export * from './wallet-history.entity';
export * from './wallet.entity';
export * from './collection-trading-data.entity';
export * from './trading-record-log.entity';

export const entities = [
  Account,
  AccountAccountFollow,
  AccountAvatarDecoration,
  AccountBadge,
  AccountChainSummary,
  AccountChainSummaryStats,
  AccountFeatured,
  AccountFeaturedAsset,
  AccountGpBalance,
  AccountGpBalanceHistory,
  AccountGpQuest,
  AccountGpQuestCompleted,
  AccountGpExpiry,

  AccountReferral,
  AccountRenameLog,
  AccountSocialToken,

  AggregatorOpenSeaCollection,
  AggregatorOpenSeaRepairLog,
  AggregatorWssProgress,
  Asset,

  AssetAsEthAccount,
  AssetExtra,
  AssetTraits,
  AvatarDecoration,
  Badge,
  Blockchain,
  Collection,

  CollectionTradingBoardOneDay,
  CollectionTradingBoardOneHour,
  CollectionTradingBoardOneMonth,
  CollectionTradingBoardOneWeek,
  CollectionVolumeAllDays,
  CollectionVolumeSevenDays,
  CollectionVolumeThirtyDays,
  CollectionVolumeToday,
  Contract,
  Currency,
  CurrencyPriceHistory,
  EthAccount,
  EventRpcLog,
  EventWssProgress,

  GlobalValue,
  ImportCollectionErrorLog,
  ImportCollectionLog,
  LootexAirdropEvent,
  LootexAirdropHistory,
  LootexNftHolder,
  MonitorAlertChannel,
  NumberTraits,
  PollerProgress,
  PollerProgressLootexAirdrop,
  PollerProgressProject,
  PollerProgressTemporary,
  ReportLog,
  SeaportOrder,
  SeaportOrderAsset,
  SeaportOrderHistory,

  StringTraits,
  StudioContract,
  StudioContractDrop,
  StudioContractItemMetadata,
  SwapHistory,

  Wallet,
  WalletHistory,
  WalletNftSummary,
  WalletSummary,
  StudioContractUploadItem,
  CollectionTradingData,
  TradingRecordLog,
  GpPool,
  GpPoolHistory,
  TradeRewardRule,
  TradeRewardHistory,
  TradeRewardStats,
  SdkApiKey,
  SdkGalxeLog,
  BiruPoint,
  BiruPointHistory,
  BiruCollection,
  BiruDiscordWallet,
  BiruSeason,
  BiruEverMoonCollection,
  BiruEverMoonHistory,
  StakeParams,
  StakeWalletBeer,
  StakeWalletStats,
  StakeNft,
  StakeNftHistory,
  StakeNftBeerHistory,
  StakeWalletClaimHistory,
  StakeBeerSyncHistory,
  StakeCollection,
  StakeSeason,
  StoreProduct,
  StoreCollection,
  StoreGameCode,
  StoreRedemption,
  StoreMintedNft,
  StoreBeerHistory,
  FizzpopUser,
  FizzpopGameInfo,
  FizzpopUserGameLog,
  FizzpopUserEnergy,
  FizzpopUserEnergyLog,
  FizzpopWalletList,
  FizzpopSeason,
  FizzpopUserStatistics,
  FizzpopUserSeasonBestGameLog,
  FizzpopIngameStoreItem,
  FizzpopUserBuyIngameItemLog,
];
