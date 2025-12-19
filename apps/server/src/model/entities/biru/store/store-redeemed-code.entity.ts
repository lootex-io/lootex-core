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

/**
 * 暂时不用
 */
@Table({
  tableName: 'biru_store_redeemed_code',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StoreGameCode extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'product_id',
    type: DataType.UUID,
  })
  productId: string;

  @Column({
    field: 'code',
    type: DataType.STRING,
  })
  code: string;

  @Column({
    field: 'game_name',
    type: DataType.STRING,
  })
  gameName: string;

  @Column({
    field: 'game_platform',
    type: DataType.STRING,
  })
  gamePlatform: string;

  // @Column({
  //   field: 'is_used',
  //   type: DataType.BOOLEAN,
  // })
  // isUsed: boolean;

  @Column({
    field: 'is_redeemed',
    type: DataType.BOOLEAN,
  })
  isRedeemed: boolean;

  @Column({
    field: 'expiry_date',
    type: DataType.TIME(),
  })
  expiryDate: Date;

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
