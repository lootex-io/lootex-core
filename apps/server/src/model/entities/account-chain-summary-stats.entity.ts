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
  tableName: 'account_chain_summary_stats',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountChainSummaryStats extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: AccountChainSummaryStats) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: AccountChainSummaryStats) {
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
    field: 'visibility',
    type: DataType.BOOLEAN,
  })
  visibility: boolean;

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
