import {
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { FizzpopUser } from './fizzpop-user.entity';

@Table({
  tableName: 'fizzpop_user_energy',
  timestamps: true,
  paranoid: true, // For soft delete with deleted_at
})
export class FizzpopUserEnergy extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({ field: 'id', type: DataType.UUID })
  id: string;

  @IsUUID('all')
  @ForeignKey(() => FizzpopUser)
  @Column({ field: 'fizzpop_user_id', type: DataType.UUID })
  fizzpopUserId: string;

  @Column({ field: 'free_energy', type: DataType.INTEGER, allowNull: false })
  freeEnergy: number;

  @Column({ field: 'paid_energy', type: DataType.INTEGER, allowNull: false })
  paidEnergy: number;

  @CreatedAt
  @Column({ field: 'created_at', type: DataType.DATE })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at', type: DataType.DATE })
  updatedAt: Date;

  @DeletedAt
  @Column({
    field: 'deleted_at',
    type: DataType.DATE,
  })
  deletedAt: Date;
}
