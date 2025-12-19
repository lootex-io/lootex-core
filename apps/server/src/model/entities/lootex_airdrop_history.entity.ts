import {
  DataType,
  Table,
  Column,
  Model,
  AllowNull,
  PrimaryKey,
} from 'sequelize-typescript';
@Table({
  tableName: 'lootex_airdrop_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class LootexAirdropHistory extends Model {
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
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
    field: 'index',
    type: DataType.STRING(255),
  })
  index: string;

  @AllowNull(false)
  @Column({
    field: 'wallet_address',
    type: DataType.STRING(255),
  })
  walletAddress: string;

  @Column({
    field: 'token_id',
    type: DataType.STRING,
  })
  tokenId: string;

  @AllowNull(false)
  @Column({
    field: 'amount',
    type: DataType.STRING,
  })
  amount: string;

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
    field: 'tx_hash',
    type: DataType.STRING(255),
  })
  txHash: string;

  @AllowNull(false)
  @Column({
    field: 'block_timestamp',
    type: DataType.DATE,
  })
  blockTimestamp: Date;

  @AllowNull(false)
  @Column({
    field: 'created_at',
    type: DataType.DATE,
  })
  createdAt: Date;

  @AllowNull(false)
  @Column({
    field: 'updated_at',
    type: DataType.DATE,
  })
  updatedAt: Date;

  @AllowNull(true)
  @Column({
    field: 'deleted_at',
    type: DataType.DATE,
  })
  deletedAt: Date;
}
