import {
  Column,
  CreatedAt,
  DataType,
  Default,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'biru_store_product',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StoreProduct extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

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
    field: 'image_url',
    type: DataType.STRING,
  })
  imageUrl: string;

  @Column({
    field: 'price',
    type: DataType.FLOAT,
  })
  price: number;

  @Column({
    field: 'product_type',
    type: DataType.STRING,
  })
  productType: string;

  @Column({
    field: 'stock_quantity',
    type: DataType.INTEGER,
  })
  stockQuantity: number;

  @Column({
    field: 'is_active',
    type: DataType.BOOLEAN,
  })
  isActive: boolean;

  @Column({
    field: 'expiry_date',
    type: DataType.TIME(),
  })
  expiryDate: Date;

  @Column({
    field: 'sort',
    type: DataType.INTEGER(),
  })
  sort: number;

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
}

export enum StoreProductType {
  nft = 'nft',
  gamecode = 'gamecode',
}
