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
  HasOne,
} from 'sequelize-typescript';
import { Asset } from './asset.entity';
import { Currency } from './currency.entity';
import { SeaportOrder } from './seaport-order.entity';

@Table({
  tableName: 'seaport_order_asset',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class SeaportOrderAsset extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @AllowNull(false)
  @ForeignKey(() => SeaportOrder)
  @Column({
    field: 'seaport_order_id',
    type: DataType.UUIDV4,
  })
  seaportOrderId: string;

  @AllowNull(false)
  @Column({
    field: 'side',
    type: DataType.INTEGER,
  })
  // 0: offer, 1: consideration
  side: number;

  @AllowNull(false)
  @Column({
    field: 'item_type',
    type: DataType.INTEGER,
  })
  // 0: native currency, 1: ERC20, 2: ERC721, 3: ERC1155
  itemType: number;

  @Default(null)
  @Column({
    field: 'asset_id',
    type: DataType.UUIDV4,
  })
  assetId: string;

  @Default(null)
  @Column({
    field: 'currency_id',
    type: DataType.UUIDV4,
  })
  currencyId: string;

  @AllowNull(false)
  @Column({
    field: 'token',
    type: DataType.STRING,
    get: function (this: SeaportOrderAsset) {
      return this.getDataValue('token')?.toString();
    },
  })
  token: string;

  @AllowNull(false)
  @Column({
    field: 'identifier_or_criteria',
    type: DataType.STRING,
    get: function (this: SeaportOrderAsset) {
      return this.getDataValue('identifierOrCriteria')?.toString();
    },
  })
  identifierOrCriteria: string;

  @AllowNull(false)
  @Column({
    field: 'start_amount',
    type: DataType.STRING,
    get: function (this: SeaportOrderAsset) {
      return this.getDataValue('startAmount')?.toString();
    },
  })
  startAmount: string;

  @AllowNull(false)
  @Column({
    field: 'end_amount',
    type: DataType.STRING,
    get: function (this: SeaportOrderAsset) {
      return this.getDataValue('endAmount')?.toString();
    },
  })
  endAmount: string;

  @AllowNull(false)
  @Column({
    field: 'available_amount',
    type: DataType.STRING,
    get: function (this: SeaportOrderAsset) {
      return this.getDataValue('availableAmount')?.toString();
    },
  })
  availableAmount: string;

  @Default(null)
  @Column({
    field: 'recipient',
    type: DataType.STRING,
    get: function (this: SeaportOrderAsset) {
      return this.getDataValue('recipient')?.toString();
    },
  })
  recipient: string;

  @AllowNull(false)
  @Default(true)
  @Column({
    field: 'is_fillable',
    type: DataType.BOOLEAN,
  })
  isFillable: boolean;

  @BeforeSave
  static setDefaultTimeWhenSave(instance: SeaportOrderAsset) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: SeaportOrderAsset) {
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

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'deleted_at',
    type: DataType.TIME(),
  })
  deletedAt: string;

  @BelongsTo(() => SeaportOrder)
  SeaportOrder: SeaportOrder;

  @HasOne(() => Asset, {
    foreignKey: 'id',
    sourceKey: 'assetId',
    as: 'Asset',
  })
  Asset: Asset;

  @HasOne(() => Currency, {
    foreignKey: 'id',
    sourceKey: 'currencyId',
    as: 'Currency',
  })
  Currency: Currency;
}
