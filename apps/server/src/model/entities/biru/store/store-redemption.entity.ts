import {
  Column,
  CreatedAt,
  DataType,
  Default,
  HasOne,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { StoreProduct } from '@/model/entities/biru/store/store-product.entity';

@Table({
  tableName: 'biru_store_redemption',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StoreRedemption extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'wallet',
    type: DataType.STRING,
  })
  wallet: string;

  @Column({
    field: 'product_id',
    type: DataType.UUID,
  })
  productId: string;

  @Column({
    field: 'redemption_type',
    type: DataType.STRING,
  })
  redemptionType: string;

  // success, fail, pending, processing, default pending
  @Column({
    field: 'status',
    type: DataType.STRING,
  })
  status: string;

  @Column({
    field: 'quantity',
    type: DataType.INTEGER,
  })
  quantity: number;

  @Column({
    field: 'per_price',
    type: DataType.FLOAT,
  })
  perPrice: number;

  @Column({
    field: 'total_price',
    type: DataType.FLOAT,
  })
  totalPrice: number;

  // nft minted tx-hash
  @Column({
    field: 'tx_hash',
    type: DataType.STRING,
  })
  txHash: string;

  // game-codes
  @Column({
    field: 'notes',
    type: DataType.STRING,
  })
  notes: string;

  @Column({
    field: 'redemption_date',
    type: DataType.TIME(),
  })
  redemptionDate: Date;

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

  @HasOne(() => StoreProduct, {
    foreignKey: 'id',
    sourceKey: 'productId',
  })
  product: StoreProduct;
}

//
export enum RedemptionStatus {
  pending = 'pending', //默认
  // processing = 'processing',
  completed = 'completed',
  fail = 'fail',
}
