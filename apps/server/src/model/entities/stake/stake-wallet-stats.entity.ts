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
  tableName: 'stake_wallet_stats',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StakeWalletStats extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'address',
    type: DataType.STRING,
  })
  address: string;

  @Column({
    field: 'earning_time',
    type: DataType.INTEGER,
  })
  earningTime: number;

  @Column({
    field: 'longest_staking_time',
    type: DataType.INTEGER,
  })
  longestStakingTime: number;

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
