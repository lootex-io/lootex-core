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
  IsUUID,
} from 'sequelize-typescript';

export class BaseLog extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUID,
  })
  id: string;

  @AllowNull(false)
  @Default(null)
  @Column({
    field: 'type',
    type: DataType.STRING,
  })
  type: string;

  @AllowNull(false)
  @Default(null)
  @Column({
    field: 'action',
    type: DataType.STRING,
  })
  action: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'args',
    type: DataType.JSONB,
  })
  args: string;

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
  static setDefaultTimeWhenSave(instance: BaseLog) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: BaseLog) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }
}

@Table({
  tableName: 'log_dev',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class LogDev extends BaseLog {}

@Table({
  tableName: 'log_pro',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class LogPro extends BaseLog {}
