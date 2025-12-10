import {
  Table,
  Column,
  Model,
  PrimaryKey,
  Default,
  DataType,
  IsUUID,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { FizzpopUser } from './fizzpop-user.entity';
import { FizzpopUserGameLog } from './fizzpop-user-game-log.entity';
import { FizzpopIngameStoreItem } from './fizzpop-ingame-store-item.entity';

@Table({
  tableName: 'fizzpop_user_buy_ingame_item_log',
  timestamps: true,
})
export class FizzpopUserBuyIngameItemLog extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column(DataType.UUID)
  id: string;

  @ForeignKey(() => FizzpopUser)
  @Column({ field: 'fizzpop_user_id', type: DataType.UUID, allowNull: false })
  fizzpopUserId: string;

  @ForeignKey(() => FizzpopUserGameLog)
  @Column({ field: 'user_game_log_id', type: DataType.UUID, allowNull: false })
  userGameLogId: string;

  @ForeignKey(() => FizzpopIngameStoreItem)
  @Column({
    field: 'ingame_store_item_id',
    type: DataType.UUID,
    allowNull: false,
  })
  ingameStoreItemId: string;

  @CreatedAt
  @Column({ field: 'created_at', type: DataType.DATE })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at', type: DataType.DATE })
  updatedAt: Date;

  @DeletedAt
  @Column({ field: 'deleted_at', type: DataType.DATE })
  deletedAt: Date;

  @BelongsTo(() => FizzpopUser)
  fizzpopUser: FizzpopUser;

  @BelongsTo(() => FizzpopUserGameLog)
  userGameLog: FizzpopUserGameLog;

  @BelongsTo(() => FizzpopIngameStoreItem)
  ingameStoreItem: FizzpopIngameStoreItem;
}
