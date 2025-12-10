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
  tableName: 'stake_params',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StakeParams extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'params',
    type: DataType.JSONB,
  })
  params: any;

  @AllowNull(true)
  @Column({
    field: 'active',
    type: DataType.BOOLEAN,
  })
  active: boolean;

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

export interface StakeParamsJson {
  time_bonus_thresholds: [StakeParamsTimeBonusItem];
  quantity_bonus_thresholds: [StakeParamsQuantityBonusItem];
  rarity_base_rates: [StakeParamsRarityRateItem];
  leaderboard_reset_hour: number;
  time_unit: 'hour' | 'day';
  time_key: string;
}

export interface StakeParamsTimeBonusItem {
  time: number;
  bonus: number;
}

export interface StakeParamsQuantityBonusItem {
  count: number;
  bonus: number;
}

export interface StakeParamsRarityRateItem {
  level: string;
  bonus: number;
}

// example
// const stake_params = {
//   time_bonus_thresholds: [
//     { hours: 240, bonus: 5 },
//     { hours: 480, bonus: 10 },
//     { hours: 720, bonus: 15 },
//     { hours: 960, bonus: 20 },
//     { hours: 120, bonus: 25 },
//     { hours: 1440, bonus: 30 },
//   ],
//   quantity_bonus_thresholds: [
//     { count: 5, bonus: 5 },
//     { count: 10, bonus: 10 },
//     { count: 15, bonus: 15 },
//     { count: 20, bonus: 20 },
//     { count: 25, bonus: 25 },
//   ],
//   rarity_base_rates: [
//     { level: 'Normal', bonus: 1 },
//     { level: 'Rare', bonus: 2 },
//     { level: 'Epic', bonus: 5 },
//   ],
//   leaderboard_reset_hour: 1,
// }
