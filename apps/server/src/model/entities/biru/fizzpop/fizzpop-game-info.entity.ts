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
  Unique,
  Index,
} from 'sequelize-typescript';

@Table({
  tableName: 'fizzpop_game_info',
  timestamps: true,
  paranoid: true,
})
export class FizzpopGameInfo extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Index
  @Column({
    field: 'id',
    type: DataType.UUID,
  })
  id: string;

  @Unique
  @Column({
    field: 'name',
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Default(0)
  @Unique
  @Column({
    field: 'cost_energy',
    type: DataType.INTEGER,
    allowNull: false,
  })
  costEnergy: number;

  @Default(0)
  @Column({
    field: 'seconds_limit',
    type: DataType.INTEGER,
    allowNull: false,
  })
  secondsLimit: number;

  @Column({
    field: 'description',
    type: DataType.STRING,
    allowNull: true,
  })
  description: string;

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
