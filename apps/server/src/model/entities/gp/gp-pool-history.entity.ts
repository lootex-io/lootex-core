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
  tableName: 'gp_pool_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class GpPoolHistory extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'event',
    type: DataType.STRING,
  })
  event: number;

  @Column({
    field: 'amount',
    type: DataType.INTEGER,
  })
  amount: number;

  @Column({
    field: 'pool_value',
    type: DataType.INTEGER,
  })
  poolValue: number;

  @Column({
    field: 'account_id',
    type: DataType.STRING,
  })
  accountId;

  @Default('')
  @Column({
    field: 'note',
    type: DataType.STRING,
  })
  note: string;

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
