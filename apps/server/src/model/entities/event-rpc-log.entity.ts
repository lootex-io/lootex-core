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
  tableName: 'event_rpc_log',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class EventRpcLog extends Model {
  static EVENT_STATUS_INIT = 0; // INIT
  static EVENT_STATUS_RUNNING = 1; // RUNNING
  static EVENT_STATUS_DONE = 5; // DONE

  @BeforeSave
  static setDefaultTimeWhenSave(instance: EventRpcLog) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: EventRpcLog) {
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

  @Column({
    field: 'chain',
    type: DataType.INTEGER,
  })
  chain: number;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'start_time',
    type: DataType.TIME(),
  })
  startTime: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'end_time',
    type: DataType.TIME(),
  })
  endTime: string;

  @Column({
    field: 'start_block',
    type: DataType.INTEGER,
  })
  startBlock: number;

  @Column({
    field: 'running_block',
    type: DataType.INTEGER,
  })
  runningBlock: number;

  @Column({
    field: 'end_block',
    type: DataType.INTEGER,
  })
  endBlock: number;

  @Default(EventRpcLog.EVENT_STATUS_INIT)
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
