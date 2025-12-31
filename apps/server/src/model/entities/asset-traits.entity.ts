import {
  DataType,
  Table,
  Column,
  Model,
  AllowNull,
  Default,
  PrimaryKey,
  IsUUID,
  BeforeSave,
  BeforeUpdate,
  HasOne,
} from 'sequelize-typescript';
import { Asset } from '.';

@Table({
  tableName: 'asset_traits',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AssetTraits extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: AssetTraits) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: AssetTraits) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @AllowNull(false)
  @Column({
    field: 'asset_id',
    type: DataType.UUID,
  })
  // @ForeignKey(() => Asset)
  assetId: string;

  @AllowNull(false)
  @Column({
    field: 'collection_id',
    type: DataType.UUID,
  })
  // @ForeignKey(() => Collection)
  collectionId: string;

  @Default('')
  @Column({
    field: 'trait_type',
    type: DataType.STRING,
  })
  traitType: string;

  @Default('')
  @Column({
    field: 'display_type',
    type: DataType.STRING,
  })
  displayType: string;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'value',
    type: DataType.STRING,
  })
  value: string;

  @AllowNull(true)
  @Column({
    field: 'rarity_percent',
    type: DataType.FLOAT,
  })
  rarityPercent: number;

  @AllowNull(true)
  @Column({
    field: 'total_count',
    type: DataType.INTEGER,
  })
  totalCount: number;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'created_at',
    type: DataType.TIME(),
  })
  createdAt: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'updated_at',
    type: DataType.TIME(),
  })
  updatedAt: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'deleted_at',
    type: DataType.TIME(),
  })
  deletedAt: string;

  @HasOne(() => Asset, {
    foreignKey: 'id',
    sourceKey: 'assetId',
  })
  Asset: Asset;
}
