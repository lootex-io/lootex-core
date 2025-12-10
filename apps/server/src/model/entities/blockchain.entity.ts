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
  tableName: 'blockchain',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class Blockchain extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: Blockchain) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: Blockchain) {
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

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'name',
    type: DataType.STRING,
  })
  name: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'chain',
    type: DataType.STRING,
  })
  chain: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'network',
    type: DataType.STRING,
  })
  network: string;

  @AllowNull(false)
  @Column({
    field: 'short_name',
    type: DataType.STRING,
  })
  shortName: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'network_id',
    type: DataType.INTEGER,
  })
  networkId: number;

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
}
