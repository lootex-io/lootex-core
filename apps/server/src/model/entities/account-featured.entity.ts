import {
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { Account, AccountFeaturedAsset } from './index';
@Table({
  tableName: 'account_featured',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountFeatured extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUID,
  })
  id: string;

  @ForeignKey(() => Account)
  @Column({
    field: 'account_id',
    type: DataType.UUID,
  })
  accountId: string;

  @Column({
    field: 'name',
    type: DataType.STRING,
  })
  name: string;

  @Column({
    field: 'description',
    type: DataType.STRING,
  })
  description: string;

  @Column({
    field: 'rank',
    type: DataType.INTEGER,
  })
  rank: number;

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

  @HasMany(() => AccountFeaturedAsset, {
    foreignKey: 'accountFeaturedId',
    sourceKey: 'id',
  })
  AccountFeaturedAssets: AccountFeaturedAsset[];
}
