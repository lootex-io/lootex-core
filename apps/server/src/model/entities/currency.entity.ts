import { Blockchain } from './blockchain.entity';
import { SeaportOrderAsset } from './seaport-order-asset.entity';
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
  BelongsTo,
  ForeignKey,
  HasMany,
} from 'sequelize-typescript';

@Table({
  tableName: 'currency',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class Currency extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Default(null)
  @Column({
    field: 'address',
    type: DataType.STRING,
    get: function (this: Currency) {
      return this.getDataValue('address')?.toString();
    },
  })
  address: string;

  @AllowNull(false)
  @Column({
    field: 'name',
    type: DataType.STRING,
  })
  name: string;

  @Default(null)
  @Column({
    field: 'symbol',
    type: DataType.STRING,
  })
  symbol: string;

  @AllowNull(false)
  @Column({
    field: 'decimals',
    type: DataType.INTEGER,
  })
  decimals: number;

  @AllowNull(false)
  @Column({
    field: 'is_native',
    type: DataType.BOOLEAN,
  })
  isNative: boolean;

  @AllowNull(false)
  @Column({
    field: 'is_wrapped',
    type: DataType.BOOLEAN,
  })
  isWrapped: boolean;

  @AllowNull(false)
  @ForeignKey(() => Blockchain)
  @Column({
    field: 'blockchain_id',
    type: DataType.UUIDV4,
  })
  blockchainId: string;

  @BeforeSave
  static setDefaultTimeWhenSave(instance: Currency) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: Currency) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

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

  @Default(null)
  @Column({
    field: 'deleted_at',
    type: DataType.TIME(),
  })
  deletedAt: string;

  @BelongsTo(() => Blockchain)
  Blockchain: Blockchain;

  @HasMany(() => SeaportOrderAsset, {
    foreignKey: 'currencyId',
    sourceKey: 'id',
    as: 'SeaportOrderAsset',
  })
  SeaportOrderAssets: SeaportOrderAsset[];
}
