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
import {
  BlockStatus,
  ReportStatus,
  ReportType,
} from '@/model/entities/constant-model';
import { IsEnum } from 'class-validator';

@Table({
  tableName: 'report_log',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class ReportLog extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: ReportLog) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: ReportLog) {
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
  @IsEnum(ReportType)
  @Column({
    field: 'type',
    type: DataType.ENUM(...Object.values(ReportType)),
  })
  type: ReportType;

  @AllowNull(false)
  @Column({
    field: 'source_id',
    type: DataType.UUIDV4,
    comment: 'report對象',
  })
  sourceId: string;

  @AllowNull(true)
  @Column({
    field: 'operator_id',
    type: DataType.UUIDV4,
    comment: '審核人員',
  })
  operatorId: string;

  @AllowNull(true)
  @Column({
    field: 'reporter_id',
    type: DataType.UUIDV4,
    comment: 'report人員',
  })
  reporterId: string;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'reason',
    type: DataType.STRING,
  })
  reason: string;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'url',
    type: DataType.STRING,
    comment: '項目連接',
  })
  url: string;

  @AllowNull(true)
  @Default(null)
  @IsEnum(ReportStatus)
  @Column({
    field: 'review_block',
    type: DataType.ENUM(...Object.values(BlockStatus)),
    comment: '审核结果 Normal or Blocked',
  })
  reviewBlock: BlockStatus;

  @AllowNull(false)
  @Default(ReportStatus.INIT)
  @IsEnum(ReportStatus)
  @Column({
    field: 'status',
    type: DataType.ENUM(...Object.values(ReportStatus)),
  })
  status: ReportStatus;

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
    foreignKey: 'reporterId',
  })
  reporter: Account;

  @BelongsTo(() => Account, {
    foreignKey: 'operatorId',
  })
  operator: Account;
}
