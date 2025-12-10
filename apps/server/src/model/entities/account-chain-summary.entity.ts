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
  tableName: 'account_chain_summary',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountChainSummary extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: AccountChainSummary) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: AccountChainSummary) {
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
    field: 'account_id',
    type: DataType.UUIDV4,
  })
  accountId: string;

  @Column({
    field: 'chain',
    type: DataType.INTEGER,
  })
  chain: number;

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

  @Default('0')
  @Column({
    field: 'total_gas_fee',
    type: DataType.STRING,
  })
  totalGasFee: string;

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
