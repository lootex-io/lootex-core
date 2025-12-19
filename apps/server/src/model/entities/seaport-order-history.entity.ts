import { AssetEventCategory } from '@/api/v3/asset/asset.interface';
import {
  DataType,
  Table,
  Column,
  Model,
  AllowNull,
  Default,
  PrimaryKey,
  IsUUID,
} from 'sequelize-typescript';
import { OrderStatus } from '@/model/entities/constant-model';
import { IsEnum } from 'class-validator';

@Table({
  tableName: 'seaport_order_history',
  timestamps: true,
  createdAt: 'createdAt',
})
export class SeaportOrderHistory extends Model {
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
    field: 'ip',
    type: DataType.STRING,
  })
  ip: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'area',
    type: DataType.STRING,
  })
  area: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'block_height',
    type: DataType.STRING,
  })
  blockHeight: string;

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
    field: 'contract_address',
    type: DataType.STRING,
    get: function (this: SeaportOrderHistory) {
      return this.getDataValue('contractAddress')?.toString();
    },
  })
  contractAddress: string;

  @Column({
    field: 'token_id',
    type: DataType.STRING,
  })
  tokenId: string;

  @Column({
    field: 'amount',
    type: DataType.STRING,
  })
  amount: string;

  @AllowNull(false)
  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @AllowNull(false)
  @Column({
    field: 'category',
    type: DataType.ENUM,
    values: [
      'list',
      'offer',
      'sale',
      'collection_offer',
      'transfer',
      'mint',
      'airdrop',
      'burn',
    ],
  })
  category: AssetEventCategory;

  @AllowNull(false)
  @Column({
    field: 'start_time',
    type: DataType.TIME(),
  })
  startTime: string;

  @Column({
    field: 'end_time',
    type: DataType.TIME(),
  })
  endTime: string;

  @Column({
    field: 'price',
    type: DataType.REAL,
  })
  price: number;

  @Column({
    field: 'currency_symbol',
    type: DataType.STRING,
  })
  currencySymbol: string;

  @Column({
    field: 'usd_price',
    type: DataType.REAL,
  })
  usdPrice: number;

  @AllowNull(false)
  @Column({
    field: 'from_address',
    type: DataType.STRING,
    get: function (this: SeaportOrderHistory) {
      return this.getDataValue('fromAddress')?.toString();
    },
  })
  fromAddress: string;

  @Column({
    field: 'to_address',
    type: DataType.STRING,
    get: function (this: SeaportOrderHistory) {
      return this.getDataValue('toAddress')?.toString();
    },
  })
  toAddress: string;

  @Column({
    field: 'hash',
    type: DataType.STRING,
    get: function (this: SeaportOrderHistory) {
      return this.getDataValue('hash')?.toString();
    },
  })
  hash: string;

  @Column({
    field: 'tx_hash',
    type: DataType.STRING,
    get: function (this: SeaportOrderHistory) {
      return this.getDataValue('txHash')?.toString();
    },
  })
  txHash: string;

  @Column({
    field: 'campaign202403_block',
    type: DataType.BOOLEAN,
  })
  campaign202403Block: string;

  @Default(null)
  @AllowNull(true)
  @Column({
    field: 'exchange_address',
    type: DataType.STRING,
    get: function (this: SeaportOrderHistory) {
      return this.getDataValue('exchangeAddress')?.toString();
    },
  })
  exchangeAddress: string;

  @Column({
    field: 'service_fee_amount',
    type: DataType.STRING,
  })
  serviceFeeAmount: string;

  @Column({
    field: 'service_fee_usd_price',
    type: DataType.REAL,
  })
  serviceFeeUsdPrice: number;

  @AllowNull(true)
  @Column({
    field: 'sdk_api_key_id',
    type: DataType.STRING,
  })
  sdkApiKeyId: string;

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

  @AllowNull(true)
  @Default(OrderStatus.INIT)
  @IsEnum(OrderStatus)
  @Column({
    field: 'order_status',
    type: DataType.ENUM(...Object.values(OrderStatus)),
  })
  orderStatus: OrderStatus;
}
