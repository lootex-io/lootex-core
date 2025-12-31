import {
  DataType,
  Table,
  Column,
  Model,
  AllowNull,
  Default,
  PrimaryKey,
  BeforeSave,
  BeforeUpdate,
} from 'sequelize-typescript';
@Table({
  tableName: 'poller_progress_project',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class PollerProgressProject extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column({
    field: 'project_name',
    type: DataType.STRING,
  })
  projectName: string;

  @AllowNull(false)
  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @AllowNull(false)
  @Default(null)
  @Column({
    field: 'chain_name',
    type: DataType.STRING,
  })
  chainName: string;

  @AllowNull(false)
  @Column({
    field: 'last_polled_block',
    type: DataType.INTEGER,
  })
  lastPolledBlock: number;

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

  @BeforeSave
  static setDefaultTimeWhenSave(instance: PollerProgressProject) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: PollerProgressProject) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }
}
