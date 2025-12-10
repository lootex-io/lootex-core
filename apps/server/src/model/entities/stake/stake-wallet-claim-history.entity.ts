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

@Table({
  tableName: 'stake_wallet_claim_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StakeWalletClaimHistory extends Model {
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
    field: 'beer',
    type: DataType.FLOAT,
  })
  beer: number;

  @Column({
    field: 'before_claimed_beer',
    type: DataType.FLOAT,
  })
  beforeClaimedBeer: number;

  @Default('Claim')
  @Column({
    field: 'category',
    type: DataType.STRING,
  })
  category: string;

  // // yyyy-mm-dd-hh
  // @Column({
  //   field: 'claim_key',
  //   type: DataType.STRING,
  // })
  // claimKey: string;

  @Column({
    field: 'tx_hash',
    type: DataType.STRING,
  })
  txHash: string;

  @CreatedAt
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

export enum StakeClaimHistoryCategory {
  Claim = 'Claim',
  Burn = 'Burn',
}
