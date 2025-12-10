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

/**
 * 记录wss连接时间
 */
@Table({
  tableName: 'aggregator_wss_progress',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AggregatorWssProgress extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: AggregatorWssProgress) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: AggregatorWssProgress) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @PrimaryKey
  @AllowNull(false)
  @Column({
    field: 'name',
    type: DataType.STRING,
  })
  name: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'start_time',
    type: DataType.INTEGER,
  })
  startTime: number;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'end_time',
    type: DataType.INTEGER,
  })
  endTime: number;

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
