import {
  Table,
  Column,
  Model,
  DataType,
  IsUUID,
  Default,
  PrimaryKey,
  AllowNull,
} from 'sequelize-typescript';

@Table({
  tableName: 'swap_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class SwapHistory extends Model<SwapHistory> {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'in_token',
    type: DataType.STRING,
  })
  inToken: string;

  @Column({
    field: 'out_token',
    type: DataType.STRING,
  })
  outToken: string;

  @Column({
    field: 'user_in_price',
    type: DataType.STRING,
  })
  userInPrice: string;

  @Column({
    field: 'user_out_price',
    type: DataType.STRING,
  })
  userOutPrice: string;

  @Column({
    field: 'real_in_price',
    type: DataType.STRING,
  })
  realInPrice: string;

  @Column({
    field: 'real_out_price',
    type: DataType.STRING,
  })
  realOutPrice: string;

  @Column({
    field: 'slippage_tolerance',
    type: DataType.STRING,
  })
  slippageTolerance: string;

  @Column({
    field: 'in_per_usd',
    type: DataType.STRING,
  })
  inPerUsd: string;

  @Column({
    field: 'out_per_usd',
    type: DataType.STRING,
  })
  outPerUsd: string;

  @Column({
    field: 'pool_address',
    type: DataType.STRING,
  })
  poolAddress: string;

  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @Column({
    field: 'tx_hash',
    type: DataType.STRING,
  })
  txHash: string;

  @Column({
    field: 'block',
    type: DataType.INTEGER,
  })
  block: number;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'ip',
    type: DataType.STRING,
  })
  ip: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'area',
    type: DataType.STRING,
  })
  area: string;

  @AllowNull(false)
  @Column({
    field: 'created_at',
    type: DataType.DATE,
  })
  createdAt: Date;

  @AllowNull(false)
  @Column({
    field: 'updated_at',
    type: DataType.DATE,
  })
  updatedAt: Date;

  @AllowNull(true)
  @Column({
    field: 'deleted_at',
    type: DataType.DATE,
  })
  deletedAt: Date;
}
