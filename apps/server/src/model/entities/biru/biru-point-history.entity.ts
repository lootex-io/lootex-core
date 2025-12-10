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
  tableName: 'biru_point_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class BiruPointHistory extends Model {
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
    field: 'amount',
    type: DataType.INTEGER,
  })
  amount: number;

  // free, pay
  @Column({
    field: 'mint_type',
    type: DataType.STRING,
  })
  mintType: string;

  @Column({
    field: 'mint_price',
    type: DataType.STRING,
  })
  mintPrice: string;

  @Column({
    field: 'tx_hash',
    type: DataType.STRING,
  })
  txHash: string;

  @Column({
    field: 'quantity_claimed',
    type: DataType.INTEGER,
  })
  quantityClaimed: number;

  @Column({
    field: 'note',
    type: DataType.STRING,
  })
  note: string;

  @Default('ETH')
  @Column({
    field: 'symbol',
    type: DataType.STRING,
  })
  symbol: string;

  @Default('')
  @Column({
    field: 'contract_address',
    type: DataType.STRING,
  })
  contractAddress: string;

  @Default('')
  @Column({
    field: 'tx_fee',
    type: DataType.STRING,
  })
  txFee: string;

  @Column({
    field: 'claimed_at',
    type: DataType.TIME(),
  })
  claimedAt: Date;

  @Column({
    field: 'start_token_id',
    type: DataType.STRING,
  })
  startTokenId: string;

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

export enum BiruMintHistoryNote {
  Confirmed = 'Confirmed',
  Pending = 'Pending',
}

export enum BiruMintHistoryType {
  Free = 'Free',
  Pay = 'Pay',
  Community = 'Community',
}
