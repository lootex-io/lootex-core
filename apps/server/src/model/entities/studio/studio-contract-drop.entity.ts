import {
  Table,
  Column,
  Model,
  PrimaryKey,
  Default,
  DataType,
  ForeignKey,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  BelongsTo,
} from 'sequelize-typescript';
import { StudioContract } from './studio-contract.entity'; // 假設有一個 `studio-contract.model.ts` 定義了 `StudioContract` 模型
import { Currency } from '../currency.entity';

@Table({
  tableName: 'studio_contract_drop',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StudioContractDrop extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'id',
  })
  id: string;

  @ForeignKey(() => StudioContract)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'studio_contract_id',
  })
  studioContractId: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'allowlist',
  })
  allowlist: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'amount',
  })
  amount: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'price',
  })
  price: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'start_time',
  })
  startTime: Date;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'limit_per_wallet',
  })
  limitPerWallet: string;

  @Column({
    type: DataType.STRING,
    field: 'merkle_root',
  })
  merkleRoot: string;

  @Column({
    type: DataType.JSONB,
    field: 'merkle_proof',
  })
  merkleProof: object;

  @BelongsTo(() => Currency, {
    foreignKey: 'currencyId',
    targetKey: 'id',
    as: 'currency',
  })
  @Column({
    type: DataType.STRING,
    field: 'currency_id',
  })
  currencyId: string;

  @Column({
    type: DataType.STRING,
    field: 'metadata',
  })
  metadata: string;

  @Column({
    type: DataType.STRING,
    field: 'token_id',
  })
  tokenId: string;

  @CreatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'created_at',
  })
  createdAt: Date;

  @DeletedAt
  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'deleted_at',
  })
  deletedAt: Date;

  @UpdatedAt
  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'updated_at',
  })
  updatedAt: Date;
}
