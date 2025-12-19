import {
  BelongsTo,
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
import { Account } from '@/model/entities';

@Table({
  tableName: 'account_gp_balance',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountGpBalance extends Model {
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
    field: 'total_balance',
    type: DataType.BIGINT,
  })
  totalBalance: string;

  @Column({
    field: 'frozen_balance',
    type: DataType.BIGINT,
  })
  frozenBalance: string;

  @Column({
    field: 'available_balance',
    type: DataType.BIGINT,
  })
  availableBalance: string;

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

  @BelongsTo(() => Account, {
    foreignKey: 'accountId',
  })
  Account: Account;
}
