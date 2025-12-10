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
  tableName: 'account_gp_expiry',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountGpExpiry extends Model {
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
    type: DataType.STRING,
  })
  accountId: string;

  @Column({
    field: 'gp_balance_id',
    type: DataType.STRING,
  })
  gpBalanceId: string;

  // gp balance history
  @Column({
    field: 'history_id',
    type: DataType.STRING,
  })
  historyId: string;

  @Column({
    field: 'initial_amount',
    type: DataType.BIGINT,
  })
  initialAmount: number;

  @Column({
    field: 'amount',
    type: DataType.BIGINT,
  })
  amount: number;

  @Column({
    field: 'expiry_time',
    type: DataType.TIME(),
  })
  expiryTime: Date;

  @Column({
    field: 'deleted',
    type: DataType.BOOLEAN(),
  })
  deleted: boolean;

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
