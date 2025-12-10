import { AssetExtra } from '@/model/entities';
import {
  BelongsTo,
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
import { Asset } from './asset.entity';
import { AccountFeatured } from './account-featured.entity';

@Table({
  tableName: 'account_featured_asset',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountFeaturedAsset extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUID,
  })
  id: string;

  @ForeignKey(() => AccountFeatured)
  @IsUUID('all')
  @Column({
    field: 'account_featured_id',
    type: DataType.UUID,
  })
  accountFeaturedId: string;

  @ForeignKey(() => Asset)
  @IsUUID('all')
  @Column({
    field: 'asset_id',
    type: DataType.UUID,
  })
  assetId: string;

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

  @BelongsTo(() => AccountFeatured, {
    foreignKey: 'accountFeaturedId',
  })
  AccountFeatured: AccountFeatured;

  @HasOne(() => Asset, {
    foreignKey: 'id',
    sourceKey: 'assetId',
  })
  Asset: Asset;

  @HasOne(() => AssetExtra, {
    foreignKey: 'assetId',
    sourceKey: 'assetId',
  })
  AssetExtra: AssetExtra;
}
