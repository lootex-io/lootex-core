import {
  AllowNull,
  Column,
  DataType,
  Default,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'trade_reward_stats',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class TradeRewardStats extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'account_id',
    type: DataType.STRING,
  })
  accountId: string;

  // account trading volume
  @Column({
    field: 'trade_volume',
    type: DataType.REAL,
  })
  tradeVolume: number;

  // account trading volume
  @Column({
    field: 'service_fee_volume',
    type: DataType.REAL,
  })
  serviceFeeVolume: number;

  // 推荐人
  @Column({
    field: 'referrer_id',
    type: DataType.STRING,
  })
  referrerId: string;

  // (给别人)推荐奖励 usd
  @Column({
    field: 'referrer_reward_usd',
    type: DataType.REAL,
  })
  referrerRewardUsd: number;

  // (给别人)推荐奖励 gp
  @Column({
    field: 'referrer_reward_gp',
    type: DataType.INTEGER,
  })
  referrerRewardGp: number;

  @Column({
    field: 'received_referrer_reward_usd',
    type: DataType.REAL,
  })
  receivedReferralRewardUsd: number;

  @Column({
    field: 'received_referrer_reward_gp',
    type: DataType.INET,
  })
  receivedReferralRewardGp: number;

  @Column({
    field: 'claimable_trade_reward_gp',
    type: DataType.INTEGER,
  })
  claimableTradeRewardGp: number;

  @Column({
    field: 'claimed_trade_reward_gp',
    type: DataType.INTEGER,
  })
  claimedTradeRewardGp: number;

  @Column({
    field: 'claimable_referral_reward_gp',
    type: DataType.INTEGER,
  })
  claimableReferralRewardGp: number;

  @Column({
    field: 'claimed_referral_reward_gp',
    type: DataType.INTEGER,
  })
  claimedReferralRewardGp: number;

  // 交易奖励 usd
  @Column({
    field: 'reward_usd',
    type: DataType.REAL,
  })
  rewardUsd: number;

  // 交易奖励gp
  @Column({
    field: 'reward_gp',
    type: DataType.INTEGER,
  })
  rewardGp: number;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'created_at',
    type: DataType.TIME(),
  })
  createdAt: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'updated_at',
    type: DataType.TIME(),
  })
  updatedAt: string;
}
