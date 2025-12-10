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
 * biru mint collection for compaign
 */

@Table({
  tableName: 'biru_evermoon_collection',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class BiruEverMoonCollection extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @Column({
    field: 'address',
    type: DataType.STRING,
  })
  address: string;

  @Column({
    field: 'extra_point',
    type: DataType.INTEGER,
  })
  extraPoint: number;

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
