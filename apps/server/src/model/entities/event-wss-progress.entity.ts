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
  tableName: 'event_wss_progress',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class EventWssProgress extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: EventWssProgress) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: EventWssProgress) {
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
    field: 'end_block',
    type: DataType.INTEGER,
  })
  endBlock: number;

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
