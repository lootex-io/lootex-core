import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Default,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'account_gp_quest',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountGpQuest extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  /**
   * quest 标识
   */
  @Column({
    field: 'index',
    type: DataType.INTEGER,
  })
  index: number;

  @Column({
    field: 'title',
    type: DataType.STRING,
  })
  title: string;

  @Column({
    field: 'description',
    type: DataType.STRING,
  })
  description: string;

  @Column({
    field: 'point',
    type: DataType.INTEGER,
  })
  point: number;

  @Column({
    field: 'category',
    type: DataType.STRING,
  })
  category: string;

  @Column({
    field: 'cta',
    type: DataType.STRING,
  })
  cta: string;

  @Column({
    field: 'cta_url',
    type: DataType.STRING,
  })
  ctaUrl: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'args',
    type: DataType.JSONB,
  })
  args: any;

  @Default(false)
  @Column({
    field: 'deleted',
    type: DataType.BOOLEAN,
  })
  deleted: boolean;

  @CreatedAt
  @Column({
    field: 'created_at',
    type: DataType.TIME(),
  })
  createdAt: Date;

  @UpdatedAt
  @Column({
    field: 'updated_at',
    type: DataType.TIME(),
  })
  updatedAt: Date;
}

export enum GpQuestType {
  DAILY = 'daily', // 每日
  TRADE = 'trade', // 交易
  ONEOFF = 'one-off', // 一次性
  RECOMMEND = 'recommend', // 推荐
}

export enum GpQuestCategory {
  'Default' = 'Default',
  'Daily' = 'Daily',
  'One-Off' = 'One-Off',
  'Trade' = 'Trade',
  'Recommend' = 'Recommend',
  'Collection' = 'Collection',
  'Reward' = 'Reward',
}

export enum GpQuestStatus {
  'Default' = 'Default', // 默认
  'Claimable' = 'Claimable', // 可领取
  'Completed' = 'Completed', // 结束完成
  'Error' = 'Error', // 出现错误，无法继续，比如quest超出领取时间， 会返回statusMessage字段
}
