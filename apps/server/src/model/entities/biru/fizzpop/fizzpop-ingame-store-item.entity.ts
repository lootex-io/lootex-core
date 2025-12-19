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
  HasMany,
} from 'sequelize-typescript';
import { FizzpopUserBuyIngameItemLog } from './fizzpop-user-buy-ingame-item-log.entity';

@Table({
  tableName: 'fizzpop_ingame_store_item',
  timestamps: true,
})
export class FizzpopIngameStoreItem extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column(DataType.UUID)
  id: string;

  @Column({
    field: 'name',
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  name: string;

  @Column({
    field: 'description',
    type: DataType.STRING,
    allowNull: false,
  })
  description: string;

  @Column({
    field: 'beer_point',
    type: DataType.INTEGER,
  })
  beerPoint: number;

  @CreatedAt
  @Column({ field: 'created_at', type: DataType.DATE })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at', type: DataType.DATE })
  updatedAt: Date;

  @DeletedAt
  @Column({ field: 'deleted_at', type: DataType.DATE })
  deletedAt: Date;

  @HasMany(() => FizzpopUserBuyIngameItemLog)
  userBuyLogs: FizzpopUserBuyIngameItemLog[];
}
