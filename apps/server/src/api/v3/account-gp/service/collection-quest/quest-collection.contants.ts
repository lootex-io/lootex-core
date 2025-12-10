export enum CollectionQuestType {
  TRANSACTION_AMOUNT = 'Transaction amount',
  TRANSACTION_NUMBER = 'Number of transaction',
  LISTING = 'Listing',
}

export class QuestCollection {
  type: CollectionQuestType; // 任务类型
  threshold: number; // 检测类型，阈值 eg: 1
  rewardType: string; // 奖励类型 eg:"GP"
  rewardAmount: number; // 奖励金额 eg: 1
  rewardTimes: number; // 奖励次数 eg: 10

  collectionAddress: string; // collection address
  collectionChainId: number; // collection chainId
  questStartTime: string; // 任务开始时间
  questEndTime: string; // 任务结束时间
  claimTime: string; // 领奖截止时间
}
