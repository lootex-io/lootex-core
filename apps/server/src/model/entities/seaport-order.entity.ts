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
  HasMany,
} from 'sequelize-typescript';
import { SeaportOrderAsset } from './seaport-order-asset.entity';
import { Category, OfferType } from '@/api/v3/order/order.interface';
@Table({
  tableName: 'seaport_order',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class SeaportOrder extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  // 订单所属平台 0: Default, 1: OpenSea
  @AllowNull(false)
  @Default(0)
  @Column({
    field: 'platform_type',
    type: DataType.INTEGER,
  })
  platformType: number;

  @AllowNull(false)
  @Column({
    field: 'offerer',
    type: DataType.STRING,
    get: function (this: SeaportOrder) {
      return this.getDataValue('offerer')?.toString();
    },
  })
  offerer: string;

  @AllowNull(false)
  @Column({
    field: 'signature',
    type: DataType.STRING,
    get: function (this: SeaportOrder) {
      return this.getDataValue('signature')?.toString();
    },
  })
  signature: string;

  @AllowNull(false)
  @Column({
    field: 'hash',
    type: DataType.STRING,
    get: function (this: SeaportOrder) {
      return this.getDataValue('hash')?.toString();
    },
  })
  hash: string;

  @AllowNull(false)
  @Column({
    field: 'category',
    type: DataType.ENUM,
    values: ['listing', 'offer', 'auction', 'bundle', 'other'],
  })
  category: Category;

  @Column({
    field: 'offer_type',
    type: DataType.ENUM(...Object.values(OfferType)),
  })
  offerType: OfferType;

  @AllowNull(false)
  @Column({
    field: 'order_type',
    type: DataType.INTEGER,
  })
  // 0: FULL_OPEN, 1: FULL_RESTRICTED, 2: PARTIAL_OPEN, 3: PARTIAL_RESTRICTED
  orderType: number;

  @AllowNull(false)
  @Column({
    field: 'start_time',
    type: DataType.INTEGER,
  })
  startTime: number;

  @AllowNull(false)
  @Column({
    field: 'end_time',
    type: DataType.INTEGER,
  })
  endTime: number;

  @AllowNull(false)
  @Default(true)
  @Column({
    field: 'is_fillable',
    type: DataType.BOOLEAN,
  })
  isFillable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column({
    field: 'is_cancelled',
    type: DataType.BOOLEAN,
  })
  isCancelled: boolean;

  @AllowNull(false)
  @Default(false)
  @Column({
    field: 'is_expired',
    type: DataType.BOOLEAN,
  })
  isExpired: boolean;

  @AllowNull(false)
  @Default(false)
  @Column({
    field: 'is_validated',
    type: DataType.BOOLEAN,
  })
  isValidated: boolean;

  @AllowNull(false)
  @Column({
    field: 'total_original_consideration_items',
    type: DataType.INTEGER,
  })
  totalOriginalConsiderationItems: number;

  @AllowNull(false)
  @Column({
    field: 'zone',
    type: DataType.STRING,
    get: function (this: SeaportOrder) {
      return this.getDataValue('zone')?.toString();
    },
  })
  zone: string;

  @AllowNull(false)
  @Column({
    field: 'zone_hash',
    type: DataType.STRING,
    get: function (this: SeaportOrder) {
      return this.getDataValue('zoneHash')?.toString();
    },
  })
  zoneHash: string;

  @AllowNull(false)
  @Column({
    field: 'counter',
    type: DataType.STRING,
  })
  counter: string;

  @AllowNull(false)
  @Column({
    field: 'conduit_key',
    type: DataType.STRING,
    get: function (this: SeaportOrder) {
      return this.getDataValue('conduitKey')?.toString();
    },
  })
  conduitKey: string;

  @AllowNull(false)
  @Column({
    field: 'salt',
    type: DataType.STRING,
    get: function (this: SeaportOrder) {
      return this.getDataValue('salt')?.toString();
    },
  })
  salt: string;

  @Default(null)
  @Column({
    field: 'price',
    type: DataType.REAL,
  })
  price: number;

  @Default(null)
  @Column({
    field: 'per_price',
    type: DataType.REAL,
  })
  perPrice: number;

  @AllowNull(false)
  @Column({
    field: 'exchange_address',
    type: DataType.STRING,
    get: function (this: SeaportOrder) {
      return this.getDataValue('exchangeAddress')?.toString();
    },
  })
  exchangeAddress: string;

  @AllowNull(false)
  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @BeforeSave
  static setDefaultTimeWhenSave(instance: SeaportOrder) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: SeaportOrder) {
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

  @HasMany(() => SeaportOrderAsset)
  SeaportOrderAssets: SeaportOrderAsset[];
}
