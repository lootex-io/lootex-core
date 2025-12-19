import {
  DataType,
  Table,
  Column,
  Model,
  AllowNull,
  Default,
  PrimaryKey,
  IsUUID,
  BeforeSave,
  BeforeUpdate,
} from 'sequelize-typescript';

@Table({
  tableName: 'wallet_nft_summary',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class WalletNftSummary extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: WalletNftSummary) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: WalletNftSummary) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

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
  address: string;

  @Column({
    field: 'chain',
    type: DataType.INTEGER,
  })
  chain: number;

  @Column({
    field: 'collection_address',
    type: DataType.STRING,
  })
  collectionAddress: string;

  @Default('0')
  @Column({
    field: 'total_gas_used',
    type: DataType.STRING,
  })
  totalGasUsed: string;

  @Default('0')
  @Column({
    field: 'total_gas_fee',
    type: DataType.STRING,
  })
  totalGasFee: string;

  @Default('0')
  @Column({
    field: 'tx_amount',
    type: DataType.STRING,
  })
  txAmount: string;

  @Column({
    field: 'total_nft',
    type: DataType.INTEGER,
  })
  totalNft: number;

  @Default('0')
  @Column({
    field: 'last_block_number',
    type: DataType.STRING,
  })
  lastBlockNumber: string;

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
