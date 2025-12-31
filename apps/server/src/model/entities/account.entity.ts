import { AuthEntityStatus } from '@/api/v3/auth/auth.interface';
import { IsEnum } from 'class-validator';
import {
  DataType,
  Table,
  Column,
  Model,
  AllowNull,
  Default,
  PrimaryKey,
  IsUUID,
  HasMany,
} from 'sequelize-typescript';
import { Wallet } from './wallet.entity';
import { BlockStatus } from '@/model/entities/constant-model';

@Table({
  tableName: 'user_accounts',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class Account extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUID,
  })
  id: string;

  @AllowNull(false)
  @Column({
    field: 'username',
    type: DataType.STRING,
  })
  username: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'avatar_url',
    type: DataType.STRING,
  })
  avatarUrl: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'introduction',
    type: DataType.TEXT,
  })
  introduction: string;

  @AllowNull(true)
  @Default('ACTIVE')
  @IsEnum(AuthEntityStatus)
  @Column({
    field: 'status',
    type: DataType.ENUM('ACTIVE', 'SUSPEND'),
  })
  status: AuthEntityStatus;

  @AllowNull(true)
  @Default(BlockStatus.NORMAL)
  @IsEnum(BlockStatus)
  @Column({
    field: 'block',
    type: DataType.ENUM(...Object.values(BlockStatus)),
  })
  block: BlockStatus;

  @HasMany(() => Wallet)
  wallets: Array<Wallet>;

  @AllowNull(true)
  @Column({
    field: 'created_at',
    type: DataType.TIME(),
  })
  createdAt: Date;

  @AllowNull(true)
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
