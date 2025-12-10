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
  tableName: 'sdk_galxe_log',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class SdkGalxeLog extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'api_key',
    type: DataType.STRING,
  })
  apiKey: string;

  @Default('')
  @Column({
    field: 'category',
    type: DataType.STRING,
  })
  category: string;

  @Column({
    field: 'address',
    type: DataType.STRING,
  })
  address: string;

  @Column({
    field: 'ip',
    type: DataType.STRING,
  })
  ip: string;

  @Column({
    field: 'res_status',
    type: DataType.STRING,
  })
  resStatus: string;

  @Column({
    field: 'resp',
    type: DataType.INTEGER,
  })
  resp: number;

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
