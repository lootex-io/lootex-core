import {
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { Account } from './account.entity';

@Table({
  tableName: 'account_account_follow',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountAccountFollow extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @IsUUID('all')
  @ForeignKey(() => Account)
  @Column({
    field: 'follower_id',
    type: DataType.UUIDV4,
  })
  followerId: string;

  @IsUUID('all')
  @ForeignKey(() => Account)
  @Column({
    field: 'following_id',
    type: DataType.UUIDV4,
  })
  followingId: string;

  @Column({
    field: 'is_follow',
    type: DataType.BOOLEAN(),
  })
  isFollow: boolean;

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
}
