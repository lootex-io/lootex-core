import {
  Column,
  CreatedAt,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'currency_price_history',
  timestamps: false,
  createdAt: 'createdAt',
})
export class CurrencyPriceHistory extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    field: 'id',
    type: DataType.UUID,
    allowNull: false,
  })
  id: string;

  @Column({
    field: 'symbol',
    type: DataType.STRING,
    allowNull: false,
  })
  symbol: string;

  @Column({
    field: 'price_time',
    type: DataType.TIME,
    allowNull: false,
  })
  priceTime: Date;

  @Column({
    field: 'price',
    type: DataType.DECIMAL,
    allowNull: false,
  })
  price: number;

  @Column({
    field: 'block',
    type: DataType.INTEGER,
  })
  block: number;

  @CreatedAt
  @Column({
    field: 'created_at',
    type: DataType.TIME,
    allowNull: false,
  })
  createdAt: Date;
}
