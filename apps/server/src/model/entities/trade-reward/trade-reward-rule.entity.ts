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
  tableName: 'trade_reward_rule',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class TradeRewardRule extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'trade_volume',
    type: DataType.REAL,
  })
  tradeVolume: number;

  @Column({
    field: 'max_trade_volume',
    type: DataType.REAL,
  })
  maxTradeVolume: number;

  @Column({
    field: 'service_fee',
    type: DataType.REAL,
  })
  serviceFee: number;

  @Column({
    field: 'service_fee_rate',
    type: DataType.REAL,
  })
  serviceFeeRate: number;

  @Column({
    field: 'referrer_reward_rate',
    type: DataType.REAL,
  })
  referrerRewardRate: number;

  @Column({
    field: 'trade_reward_rate',
    type: DataType.REAL,
  })
  tradeRewardRate: number;

  @Column({
    field: 'level',
    type: DataType.INTEGER,
  })
  level: number;

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
