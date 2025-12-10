import {
  Table,
  Column,
  Model,
  PrimaryKey,
  DataType,
  ForeignKey,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Account } from './account.entity';

@Table({
  tableName: 'account_rename_log',
  timestamps: true,
})
export class AccountRenameLog extends Model<AccountRenameLog> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    field: 'id',
  })
  id: string;

  @ForeignKey(() => Account)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'account_id',
  })
  accountId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'before_username',
  })
  beforeUsername: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'after_username',
  })
  afterUsername: string;

  @CreatedAt
  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
    allowNull: false,
    field: 'created_at',
  })
  createdAt: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'deleted_at',
  })
  deletedAt: Date;

  @UpdatedAt
  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
    field: 'updated_at',
    allowNull: false,
  })
  updatedAt: Date;
}
