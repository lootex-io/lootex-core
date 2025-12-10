import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { FizzpopUser } from './fizzpop-user.entity';
@Table({
  tableName: 'fizzpop_user_statistics',
  timestamps: true,
})
export class FizzpopUserStatistics extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({ type: DataType.UUID })
  id: string;

  @ForeignKey(() => FizzpopUser)
  @Column({ field: 'fizzpop_user_id', type: DataType.UUID })
  fizzpopUserId: string;

  @Default(0)
  @Column({ field: 'total_play_count', type: DataType.INTEGER })
  totalPlayCount: number;

  @Default(0)
  @Column({ field: 'highest_score', type: DataType.INTEGER })
  highestScore: number;

  @Default(0)
  @Column({ field: 'avg_score', type: DataType.FLOAT })
  avgScore: number;

  @Default(0)
  @Column({ field: 'avg_game_time', type: DataType.FLOAT })
  avgGameTime: number;

  @Column({ field: 'first_play_at', type: DataType.DATE })
  firstPlayAt: Date;

  @Column({ field: 'last_play_at', type: DataType.DATE })
  lastPlayAt: Date;

  @CreatedAt
  @Column({ field: 'created_at', type: DataType.DATE })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at', type: DataType.DATE })
  updatedAt: Date;

  @Column({ field: 'deleted_at', type: DataType.DATE })
  deletedAt: Date;

  @BelongsTo(() => FizzpopUser)
  fizzpopUser: FizzpopUser;
}
