import {
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

/**
 * nft质押记录
 */
@Table({
  tableName: 'stake_nft_beer_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StakeNftBeerHistory extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'season',
    type: DataType.STRING,
  })
  season: string;

  @Column({
    field: 'claim_id',
    type: DataType.STRING,
  })
  claimId: string;

  @Column({
    field: 'claim_key',
    type: DataType.STRING,
  })
  claimKey: string;

  @Column({
    field: 'address',
    type: DataType.STRING,
  })
  address: string;

  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @Column({
    field: 'contract_address',
    type: DataType.STRING,
  })
  contractAddress: number;

  @Column({
    field: 'token_id',
    type: DataType.STRING,
  })
  tokenId: string;

  @Column({
    field: 'beer',
    type: DataType.FLOAT,
  })
  beer: number;

  // @Column({
  //   field: 'diff_hours',
  //   type: DataType.INTEGER,
  // })
  // diffHours: number;
  @Column({
    field: 'diff_time',
    type: DataType.INTEGER,
  })
  diffTime: number;

  /**
   * 时间加成
   */
  @Column({
    field: 'time_bonus',
    type: DataType.FLOAT,
  })
  timeBonus: number;

  /**
   * 数量加成
   */
  @Column({
    field: 'quantity_bonus',
    type: DataType.FLOAT,
  })
  quantityBonus: number;

  /**
   * bonus 开始计算时间
   */
  @Column({
    field: 'start_time',
    type: DataType.TIME(),
  })
  startTime: Date;

  /**
   * bonus 截止计算时间
   */
  @Column({
    field: 'end_time',
    type: DataType.TIME(),
  })
  endTime: Date;

  /**
   * 是否已领取
   */
  @Default(false)
  @Column({
    field: 'is_claimed',
    type: DataType.BOOLEAN,
  })
  isClaimed: boolean;

  @Column({
    field: 'claimed_at',
    type: DataType.TIME(),
  })
  claimedAt: Date;

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
