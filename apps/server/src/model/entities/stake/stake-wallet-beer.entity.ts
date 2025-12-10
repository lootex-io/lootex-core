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
 * 钱包 beer
 */
@Table({
  tableName: 'stake_wallet_beer',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StakeWalletBeer extends Model {
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
    field: 'address',
    type: DataType.STRING,
  })
  address: string;

  @Column({
    field: 'total_beer',
    type: DataType.FLOAT,
  })
  totalBeer: number;

  @Column({
    field: 'available_beer',
    type: DataType.FLOAT,
  })
  availableBeer: number;

  @Column({
    field: 'frozen_beer',
    type: DataType.FLOAT,
  })
  frozenBeer: number;

  @Column({
    field: 'pending_beer',
    type: DataType.FLOAT,
  })
  pendingBeer: number;

  @Column({
    field: 'claimed_beer',
    type: DataType.FLOAT,
  })
  claimedBeer: number;

  // 废弃 ， 移到 wallet stats
  @Column({
    field: 'earning_time',
    type: DataType.INTEGER,
  })
  earningTime: number;

  // 废弃 ， 移到 wallet stats
  @Column({
    field: 'longest_staking_time',
    type: DataType.INTEGER,
  })
  longestStakingTime: number;

  // 废弃 ， 移到 wallet stats
  @Column({
    field: 'total_staking_nfts',
    type: DataType.INTEGER,
  })
  totalStakingNfts: number;

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
