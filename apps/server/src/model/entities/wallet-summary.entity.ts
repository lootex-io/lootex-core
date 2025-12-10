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
  tableName: 'wallet_summary',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class WalletSummary extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: WalletSummary) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: WalletSummary) {
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
    field: 'chain',
    type: DataType.INTEGER,
  })
  chain: number;

  @Column({
    field: 'wallet_address',
    type: DataType.STRING,
  })
  address: string;

  @Column({
    field: 'total_tx',
    type: DataType.INTEGER,
  })
  totalTx: number;

  @Column({
    field: 'total_nft',
    type: DataType.INTEGER,
  })
  totalNft: number;

  @Column({
    field: 'total_collection',
    type: DataType.INTEGER,
  })
  totalCollection: number;

  @Default('0')
  @Column({
    field: 'total_received',
    type: DataType.STRING,
  })
  totalReceived: string;

  @Default('0')
  @Column({
    field: 'total_sent',
    type: DataType.STRING,
  })
  totalSent: string;

  @Default('0')
  @Column({
    field: 'total_volume',
    type: DataType.STRING,
  })
  totalVolume: string;

  @Default('0')
  @Column({
    field: 'total_fee',
    type: DataType.STRING,
  })
  totalFee: string;

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
