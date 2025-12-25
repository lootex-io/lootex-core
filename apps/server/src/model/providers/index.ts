import { accountProvider } from './account.provider';

import { assetAsEthAccountProvider } from './asset-as-eth-account.provider';
import { assetExtraProvider } from './asset-extra.provider';
import { assetProvider } from './asset.provider';
import { assetTraitsProvider } from './asset-traits.provider';
import { blockchainProvider } from './blockchain.provider';

import { collectionProvider } from './collection.provider';
import { collectionTradingBoardOneDayProvider } from './collection-trading-board/collection-trading-board-one-day.provider';
import { collectionTradingBoardOneHourProvider } from './collection-trading-board/collection-trading-board-one-hour.provider';
import { collectionTradingBoardOneMonthProvider } from './collection-trading-board/collection-trading-board-one-month.provider';
import { collectionTradingBoardOneWeekProvider } from './collection-trading-board/collection-trading-board-one-week.provider';
import { contractProvider } from './contract.provider';
import { currencyProvider } from './currency.provider';

import { pollerProgressProvider } from './poller-progress.provider';
import { seaportOrderAssetProvider } from './seaport-order-asset.provider';
import { seaportOrderHistoryProvider } from './seaport-order-history.provider';
import { seaportOrderProvider } from './seaport-order.provider';
import { sequelizeProvider } from './sequelize.provider';

import { walletProvider } from './wallet.provider';
import { collectionTradingDataProvider } from './collection-trading-data.provider';
import { tradingRecordLogProvider } from './trading-record-log.provider';

export * from './account.provider';

export * from './asset-as-eth-account.provider';
export * from './asset-extra.provider';
export * from './asset-traits.provider';
export * from './asset.provider';
export * from './blockchain.provider';

export * from './collection-trading-board/collection-trading-board-one-day.provider';
export * from './collection-trading-board/collection-trading-board-one-hour.provider';
export * from './collection-trading-board/collection-trading-board-one-month.provider';
export * from './collection-trading-board/collection-trading-board-one-week.provider';
export * from './collection.provider';
export * from './contract.provider';
export * from './currency.provider';
export * from './poller-progress.provider';
export * from './seaport-order-asset.provider';
export * from './seaport-order-history.provider';
export * from './seaport-order.provider';
export * from './sequelize.provider';

export * from './wallet.provider';
export * from './collection-trading-data.provider';
export * from './trading-record-log.provider';

export enum ProviderTokens {
  Sequelize = 'SEQUELIZE',
}

export const providers = [
  accountProvider,
  assetAsEthAccountProvider,
  assetExtraProvider,
  assetProvider,
  assetTraitsProvider,
  blockchainProvider,

  collectionProvider,
  collectionTradingBoardOneDayProvider,
  collectionTradingBoardOneHourProvider,
  collectionTradingBoardOneMonthProvider,
  collectionTradingBoardOneWeekProvider,
  contractProvider,
  currencyProvider,

  pollerProgressProvider,
  seaportOrderAssetProvider,
  seaportOrderHistoryProvider,
  seaportOrderProvider,
  sequelizeProvider,

  walletProvider,
  collectionTradingDataProvider,
  tradingRecordLogProvider,
];
