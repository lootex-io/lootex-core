import {
  Table,
  Column,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  DataType,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Unique,
  Index,
} from 'sequelize-typescript';

export enum BlockStatus {
  Normal = 'Normal',
  Blocked = 'Blocked',
}

@Table({
  tableName: 'fizzpop_user',
  timestamps: true,
  paranoid: true, // enables deletedAt
})
export class FizzpopUser extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUID,
  })
  id: string;

  @Column({
    field: 'name',
    type: DataType.STRING,
    allowNull: true,
  })
  name: string;

  @Column({
    field: 'avatar_url',
    type: DataType.STRING,
    allowNull: true,
  })
  avatarUrl: string;

  @Unique
  @Index
  @Column({
    field: 'wallet_address',
    type: DataType.STRING,
    allowNull: false,
  })
  walletAddress: string;

  @Column({
    field: 'last_login_at',
    type: DataType.DATE,
    allowNull: true,
  })
  lastLoginAt: Date;

  @Column({
    field: 'last_login_ip',
    type: DataType.STRING,
    allowNull: true,
  })
  lastLoginIp: string;

  @Column({
    field: 'last_login_area',
    type: DataType.STRING,
    allowNull: true,
  })
  lastLoginArea: string;

  @Column({
    field: 'register_ip',
    type: DataType.STRING,
    allowNull: true,
  })
  registerIp: string;

  @Column({
    field: 'register_area',
    type: DataType.STRING,
    allowNull: true,
  })
  registerArea: string;

  @Default(BlockStatus.Normal)
  @Column({
    field: 'block',
    type: DataType.ENUM('Normal', 'Blocked'),
  })
  block: BlockStatus;

  @CreatedAt
  @Column({
    field: 'created_at',
    type: DataType.DATE,
  })
  createdAt: Date;

  @UpdatedAt
  @Column({
    field: 'updated_at',
    type: DataType.DATE,
  })
  updatedAt: Date;

  @DeletedAt
  @Column({
    field: 'deleted_at',
    type: DataType.DATE,
  })
  deletedAt: Date;
}
