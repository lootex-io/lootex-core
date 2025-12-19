export enum BlockStatus {
  NORMAL = 'Normal',
  INVESTIGATE = 'Investigate',
  BLOCKED = 'Blocked',
}

export enum OrderStatus {
  INIT = 'Init',
  FULFILLED = 'Fulfilled',
  EXPIRED = 'Expired',
  VALIDATED = 'Validated',
  CANCELED = 'Canceled',
}

export enum ReportType {
  USER = 'User',
  ASSET = 'Asset',
  COLLECTION = 'Collection',
  MEDIA = 'Media',
}

export enum ReportStatus {
  INIT = 'Init',
  REVIEWED = 'Reviewed',
  CLOSED = 'Closed',
}

export enum GpTxEvent {
  TOP_UP = 'TopUp',
  TRANSACTION = 'Transaction',
  QUEST = 'Quest',
  Referral = 'Referral Reward',
  Trade = 'Trade Reward',
}

export enum GpPoolEvent {
  QUEST = 'Quest',
  TOP_UP = 'TopUp',
}
