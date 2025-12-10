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
  tableName: 'wallet_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class WalletHistory extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'wallet_address',
    type: DataType.STRING,
  })
  walletAddress: string;

  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @Column({
    field: 'contract_address',
    type: DataType.STRING,
  })
  contractAddress: string;

  @Column({
    field: 'event',
    type: DataType.STRING,
  })
  event: string;

  @Column({
    field: 'tag',
    type: DataType.STRING,
  })
  tag: string;

  @Default(false)
  @Column({
    field: 'is_main_event',
    type: DataType.BOOLEAN,
  })
  isMainEvent: boolean;

  @AllowNull(true)
  @Column({
    field: 'symbol',
    type: DataType.STRING,
  })
  symbol: string;

  @Column({
    field: 'tx_hash',
    type: DataType.STRING,
  })
  txHash: string;

  @Column({
    field: 'log_index',
    type: DataType.INTEGER,
  })
  logIndex: number;

  @AllowNull(true)
  @Column({
    field: 'out_amount',
    type: DataType.STRING,
  })
  outAmount: string;

  @AllowNull(true)
  @Column({
    field: 'out_amount_usd',
    type: DataType.STRING,
  })
  outAmountUsd: string;

  @AllowNull(true)
  @Column({
    field: 'in_amount',
    type: DataType.STRING,
  })
  inAmount: string;

  @AllowNull(true)
  @Column({
    field: 'in_amount_usd',
    type: DataType.STRING,
  })
  inAmountUsd: string;

  @AllowNull(true)
  @Column({
    field: 'to_address',
    type: DataType.STRING,
  })
  toAddress: string;

  @AllowNull(true)
  @Column({
    field: 'nft_address',
    type: DataType.STRING,
  })
  nftAddress: string;

  @AllowNull(true)
  @Column({
    field: 'currency_address',
    type: DataType.STRING,
  })
  currencyAddress: string;

  @AllowNull(true)
  @Column({
    field: 'token_id',
    type: DataType.STRING,
  })
  tokenId: string;

  @AllowNull(true)
  @Column({
    field: 'bool',
    type: DataType.BOOLEAN(),
  })
  bool: boolean;

  @Column({
    field: 'block_time',
    type: DataType.TIME(),
  })
  blockTime: string;

  @Column({
    field: 'block',
    type: DataType.INTEGER(),
  })
  block: number;

  @Column({
    field: 'fee',
    type: DataType.STRING,
  })
  fee: string;

  @Column({
    field: 'is_sa',
    type: DataType.BOOLEAN,
  })
  isSa: boolean;

  @Column({
    field: 'is_paymaster',
    type: DataType.BOOLEAN,
  })
  isPaymaster: boolean;

  @Column({
    field: 'order_hash',
    type: DataType.STRING,
  })
  orderHash: string;

  @Column({
    field: 'native_usd_price',
    type: DataType.STRING,
  })
  nativeUsdPrice: string;

  @Column({
    field: 'ip',
    type: DataType.STRING,
  })
  ip: string;

  @Column({
    field: 'area',
    type: DataType.STRING,
  })
  area: string;

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

  @Column({
    field: 'deleted_at',
    type: DataType.TIME(),
  })
  deletedAt: Date;
}
