import {
  AllowNull,
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

@Table({
  tableName: 'account_gp_quest_completed',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountGpQuestCompleted extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  /**
   * quest 标识
   */
  @Column({
    field: 'quest_index',
    type: DataType.INTEGER,
  })
  questIndex: number;

  @Column({
    field: 'account_id',
    type: DataType.STRING,
  })
  accountId: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'args',
    type: DataType.JSONB,
  })
  args: any;

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
