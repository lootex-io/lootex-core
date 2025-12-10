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
} from 'sequelize-typescript';

/**
 * aggregator 监控的collection
 */
@Table({
  tableName: 'aggregator_opensea_watched_collection',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AggregatorOpenSeaCollection extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: AggregatorOpenSeaCollection) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: AggregatorOpenSeaCollection) {
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

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'chain',
    type: DataType.INTEGER,
  })
  chain: number;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'address',
    type: DataType.STRING,
  })
  address: string;

  @Column({
    field: 'is_selected',
    type: DataType.BOOLEAN,
  })
  isSelected: boolean;

  @Default(null)
  @Column({
    field: 'slug',
    type: DataType.STRING,
  })
  slug: string;

  @Column({
    field: 'is_manual_added',
    type: DataType.BOOLEAN,
  })
  isManualAdded: boolean;

  @Default(false)
  @Column({
    field: 'deleted',
    type: DataType.BOOLEAN,
  })
  deleted: boolean;

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

  @Column(DataType.STRING)
  safelist_status: string;

  @Column(DataType.STRING)
  category: string;

  @Column(DataType.BOOLEAN)
  is_disabled: boolean;

  @Column(DataType.BOOLEAN)
  is_nsfw: boolean;
}
