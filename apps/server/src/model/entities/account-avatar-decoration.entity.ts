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
  tableName: 'account_avatar_decoration',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountAvatarDecoration extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @Column({
    field: 'account_id',
    type: DataType.UUIDV4,
  })
  accountId: string;

  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @Column({
    field: 'avatar_decoration_id',
    type: DataType.UUIDV4,
  })
  avatarDecorationId: string;

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
