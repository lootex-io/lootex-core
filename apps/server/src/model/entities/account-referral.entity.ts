import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  HasOne,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { Account } from './account.entity';

@Table({
  tableName: 'account_referral',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountReferral extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  // 邀請人
  @ForeignKey(() => Account)
  @Column({
    field: 'referrer_id',
    type: DataType.UUID,
  })
  referrerId: string;

  // 被邀請人
  @ForeignKey(() => Account)
  @Column({
    field: 'referral_id',
    type: DataType.UUID,
  })
  referralId: string;

  @Column({
    field: 'category',
    type: DataType.STRING,
  })
  category: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'ip',
    type: DataType.STRING,
  })
  ip: string;

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

  @HasOne(() => Account, {
    foreignKey: 'id',
    sourceKey: 'referrerId',
  })
  Referrer: Account;

  @HasOne(() => Account, {
    foreignKey: 'id',
    sourceKey: 'referralId',
  })
  Referral: Account;
}
