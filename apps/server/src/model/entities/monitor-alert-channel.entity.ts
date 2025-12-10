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
  BelongsTo,
} from 'sequelize-typescript';

import { Account } from '@/model/entities';

@Table({
  tableName: 'monitor_alert_channel',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class MonitorAlertChannel extends Model {
  static TYPE_IP = 0;
  static TYPE_REFERRER_CODE = 1;
  static TYPE_ORDER_TRADE = 2;
  static TYPE_SYNC_COLLECTION_RPC = 3;

  @BeforeSave
  static setDefaultTimeWhenSave(instance: MonitorAlertChannel) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: MonitorAlertChannel) {
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
  @Column({
    field: 'category',
    type: DataType.STRING,
    comment: 'mission-category',
  })
  category: string;

  @AllowNull(false)
  @Column({
    field: 'alert_key',
    type: DataType.STRING,
    comment: '',
  })
  alertKey: string;

  @Default(0)
  @Column({
    field: 'sum',
    type: DataType.NUMBER,
    comment: '計數',
  })
  sum: number;

  @AllowNull(true)
  @Column({
    field: 'alert_account',
    type: DataType.UUIDV4,
    comment: '相關Account',
  })
  alertAccount: string;

  @AllowNull(true)
  @Column({
    field: 'alert_reason',
    type: DataType.STRING,
    comment: '',
  })
  alertReason: string;

  @Default(MonitorAlertChannel.TYPE_IP)
  @AllowNull(false)
  @Column({
    field: 'type',
    type: DataType.NUMBER,
    comment: '標註類型,ip, referrer code, order trade',
  })
  type: number;

  @AllowNull(false)
  @Column({
    field: 'status',
    type: DataType.NUMBER,
    comment: '',
  })
  status: number;

  @Default('')
  @AllowNull(true)
  @Column({
    field: 'op_team',
    type: DataType.STRING,
    comment: '',
  })
  opTeam: string;

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

  @BelongsTo(() => Account, {
    foreignKey: 'alert_account',
  })
  Account: Account;
}
