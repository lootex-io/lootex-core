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
  tableName: 'aggregator_opensea_repair_log',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AggregatorOpenSeaRepairLog extends Model {
  static EVENT_STATUS_INIT = 0; // INIT
  static EVENT_STATUS_RUNNING = 1; // RUNNING
  static EVENT_STATUS_DONE = 5; // DONE

  @BeforeSave
  static setDefaultTimeWhenSave(instance: AggregatorOpenSeaRepairLog) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: AggregatorOpenSeaRepairLog) {
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

  @Default('')
  @Column({
    field: 'collections',
    type: DataType.STRING,
  })
  collections: string;

  @Default('ws')
  @Column({
    field: 'type',
    type: DataType.STRING,
  })
  type: string;

  @Default('')
  @Column({
    field: 'api_key',
    type: DataType.STRING,
  })
  apiKey: string;

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

  @Default(AggregatorOpenSeaRepairLog.EVENT_STATUS_INIT)
  @Column({
    field: 'status',
    type: DataType.INTEGER,
  })
  status: number;

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
