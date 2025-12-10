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
} from 'sequelize-typescript';

@Table({
  tableName: 'import_collection_log',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class ImportCollectionLog extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: ImportCollectionLog) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: ImportCollectionLog) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'category',
    type: DataType.STRING,
  })
  category: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'address',
    type: DataType.STRING,
  })
  address: string;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'token_id',
    type: DataType.STRING,
  })
  tokenId: string;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'fun_name',
    type: DataType.STRING,
  })
  funName: string;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'fun_parameter',
    type: DataType.STRING,
  })
  funParameter: string;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'ip',
    type: DataType.STRING,
  })
  ip: string;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'account',
    type: DataType.STRING,
  })
  account: string;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'rpc_end',
    type: DataType.STRING,
  })
  rpcEnd: string;

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
}
