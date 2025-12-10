import { ContractType } from '@/common/utils';
import {
  DataType,
  Table,
  Column,
  Model,
  AllowNull,
  PrimaryKey,
} from 'sequelize-typescript';
@Table({
  tableName: 'lootex_airdrop_event',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class LootexAirdropEvent extends Model {
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUID,
  })
  id: string;

  @AllowNull(false)
  @Column({
    field: 'event_id',
    type: DataType.STRING(255),
  })
  eventId: string;

  @AllowNull(false)
  @Column({
    field: 'token',
    type: DataType.STRING(255),
  })
  token: string;

  @AllowNull(false)
  @Column({
    field: 'source',
    type: DataType.STRING(255),
  })
  source: string;

  @AllowNull(false)
  @Column({
    field: 'merkle_root',
    type: DataType.STRING(255),
  })
  merkleRoot: string;

  @AllowNull(false)
  @Column({
    field: 'start_timestamp',
    type: DataType.DATE,
  })
  startTimestamp: Date;

  @AllowNull(false)
  @Column({
    field: 'expire_timestamp',
    type: DataType.DATE,
  })
  expireTimestamp: Date;

  @AllowNull(false)
  @Column({
    field: 'contract_type',
    type: DataType.STRING(255),
  })
  contractType: ContractType;

  @AllowNull(false)
  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @AllowNull(false)
  @Column({
    field: 'contract_address',
    type: DataType.STRING(255),
  })
  contractAddress: string;

  @AllowNull(false)
  @Column({
    field: 'created_at',
    type: DataType.DATE,
  })
  createdAt: Date;

  @AllowNull(false)
  @Column({
    field: 'deleted_at',
    type: DataType.DATE,
  })
  deletedAt: Date;

  @AllowNull(false)
  @Column({
    field: 'updated_at',
    type: DataType.DATE,
  })
  updatedAt: Date;
}
