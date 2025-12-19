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
  tableName: 'fizzpop_user_energy_log',
  timestamps: true,
  paranoid: true,
})
export class FizzpopUserEnergyLog extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({ field: 'id', type: DataType.UUID })
  id: string;

  @IsUUID('all')
  @ForeignKey(() => FizzpopUser)
  @Column({ field: 'fizzpop_user_id', type: DataType.UUID, allowNull: false })
  fizzpopUserId: string;

  @Column({
    field: 'changes_free_energy',
    type: DataType.INTEGER,
    allowNull: false,
  })
  changesFreeEnergy: number;

  @Column({
    field: 'changes_paid_energy',
    type: DataType.INTEGER,
    allowNull: false,
  })
  changesPaidEnergy: number;

  @Column({ field: 'type', type: DataType.STRING, allowNull: false })
  type: string;

  @Column({ field: 'note', type: DataType.STRING })
  note: string;

  @Column({ field: 'tx_hash', type: DataType.STRING })
  txHash: string;

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
