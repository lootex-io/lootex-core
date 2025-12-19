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
  tableName: 'trade_reward_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class TradeRewardHistory extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'chain',
    type: DataType.INTEGER,
  })
  chain: number;

  @Column({
    field: 'account_id',
    type: DataType.STRING,
  })
  accountId: string;

  // account last trading volume
  @Column({
    field: 'account_last_volume',
    type: DataType.REAL,
  })
  accountLastVolume: number;

  // account trading volume (include this transaction)
  @Column({
    field: 'account_volume',
    type: DataType.REAL,
  })
  accountVolume: number;

  @Column({
    field: 'wallet',
    type: DataType.STRING,
  })
  wallet: string;

  // 交易金额 usd
  @Column({
    field: 'trade_price',
    type: DataType.STRING,
  })
  tradePrice: string;

  // 平台费用 usd
  @Column({
    field: 'service_fee_price',
    type: DataType.STRING,
  })
  serviceFeePrice: string;

  // 推荐人
  @Column({
    field: 'referrer_id',
    type: DataType.STRING,
  })
  referrerId: string;

  // 推荐奖励 usd
  @Column({
    field: 'referrer_reward_usd',
    type: DataType.REAL,
  })
  referrerRewardUsd: number;

  // 推荐奖励 gp
  @Column({
    field: 'referrer_reward_gp',
    type: DataType.INTEGER,
  })
  referrerRewardGp: number;

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

  @Column({
    field: 'tx_hash',
    type: DataType.INTEGER,
  })
  txHash: string;

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
