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
import { FizzpopUserGameLog } from './fizzpop-user-game-log.entity';
import { FizzpopSeason } from './fizzpop-season.entity';

@Table({
  tableName: 'fizzpop_user_season_best_game_log',
  timestamps: true,
})
export class FizzpopUserSeasonBestGameLog extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({ type: DataType.UUID })
  id: string;

  @ForeignKey(() => FizzpopUser)
  @Column({ field: 'fizzpop_user_id', type: DataType.UUID })
  fizzpopUserId: string;

  @ForeignKey(() => FizzpopUserGameLog)
  @Column({ field: 'user_game_log_id', type: DataType.UUID })
  userGameLogId: string;

  @ForeignKey(() => FizzpopSeason)
  @Column({ field: 'fizzpop_season_id', type: DataType.UUID })
  fizzpopSeasonId: string;

  @CreatedAt
  @Column({ field: 'created_at', type: DataType.DATE })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at', type: DataType.DATE })
  updatedAt: Date;

  @Column({ field: 'deleted_at', type: DataType.DATE })
  deletedAt: Date;

  // 正確是 BelongsTo
  @BelongsTo(() => FizzpopUser)
  fizzpopUser: FizzpopUser;

  @BelongsTo(() => FizzpopUserGameLog)
  userGameLog: FizzpopUserGameLog;

  @BelongsTo(() => FizzpopSeason)
  fizzpopSeason: FizzpopSeason;
}
