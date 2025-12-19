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

export enum StakeSyncStatus {
  Init = 'Init',
  Running = 'Running',
  Done = 'Done',
}

/**
 * stake beer 同步记录，用来记录stake beer分发，不正不丢失
 */
@Table({
  tableName: 'stake_beer_sync_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StakeBeerSyncHistory extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'date_key',
    type: DataType.STRING,
  })
  dateKey: string;

  @Column({
    field: 'claim_key',
    type: DataType.STRING,
  })
  claimKey: string;

  /**
   * bonus 开始计算时间
   */
  @Column({
    field: 'start_time',
    type: DataType.TIME(),
  })
  startTime: Date;

  /**
   * bonus 截止计算时间
   */
  @Column({
    field: 'end_time',
    type: DataType.TIME(),
  })
  endTime: Date;

  @Default(StakeSyncStatus.Init)
  @Column({
    field: 'status',
    type: DataType.STRING,
  })
  status: string;

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
