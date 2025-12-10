import {
  Table,
  Column,
  Model,
  PrimaryKey,
  IsUUID,
  Default,
  DataType,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  ForeignKey,
  BelongsTo,
  Index,
  Unique,
} from 'sequelize-typescript';
import { FizzpopUser } from './fizzpop-user.entity';
import { FizzpopGameInfo } from './fizzpop-game-info.entity';

@Table({
  tableName: 'fizzpop_user_game_log',
  timestamps: true,
  paranoid: true,
})
export class FizzpopUserGameLog extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUID,
  })
  id: string;

  @ForeignKey(() => FizzpopUser)
  @Index
  @Column({
    field: 'fizzpop_user_id',
    type: DataType.UUID,
    allowNull: false,
  })
  fizzpopUserId: string;

  @BelongsTo(() => FizzpopUser)
  fizzpopUser: FizzpopUser;

  @ForeignKey(() => FizzpopGameInfo)
  @Column({
    field: 'fizzpop_game_info_id',
    type: DataType.UUID,
    allowNull: false,
  })
  fizzpopGameInfoId: string;

  @BelongsTo(() => FizzpopGameInfo)
  fizzpopGameInfo: FizzpopGameInfo;

  @Column({
    field: 'status',
    type: DataType.STRING,
    allowNull: false,
  })
  status: string;

  @Column({
    field: 'score',
    type: DataType.INTEGER,
    allowNull: true,
  })
  score: number;

  @Column({
    field: 'step',
    type: DataType.INTEGER,
    allowNull: true,
  })
  step: number;

  @Column({
    field: 'combo',
    type: DataType.INTEGER,
    allowNull: true,
  })
  combo: number;

  @Column({
    field: 'revive_count',
    type: DataType.INTEGER,
    allowNull: true,
  })
  reviveCount: number;

  @Default(0)
  @Column({
    field: 'resubmit_count',
    type: DataType.INTEGER,
    allowNull: true,
  })
  resubmitCount: number;

  @Unique
  @Index
  @Column({
    field: 'started_at',
    type: DataType.DATE,
    allowNull: true,
  })
  startedAt: Date;

  @Column({
    field: 'ended_at',
    type: DataType.DATE,
    allowNull: true,
  })
  endedAt: Date;

  @Column({
    field: 'run_time_seconds',
    type: DataType.INTEGER,
    allowNull: true,
  })
  runTimeSeconds: number;

  @Column({
    field: 'data',
    type: DataType.JSONB,
    allowNull: true,
  })
  data: any;

  @Index
  @Default('Normal')
  @Column({
    field: 'block',
    type: DataType.STRING,
    allowNull: false,
  })
  block: string;

  @CreatedAt
  @Column({
    field: 'created_at',
    type: DataType.DATE,
  })
  createdAt: Date;

  @UpdatedAt
  @Column({
    field: 'updated_at',
    type: DataType.DATE,
  })
  updatedAt: Date;

  @DeletedAt
  @Column({
    field: 'deleted_at',
    type: DataType.DATE,
  })
  deletedAt: Date;
}
