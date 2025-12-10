import {
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

/**
 * nft质押行为记录
 */
@Table({
  tableName: 'stake_nft_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StakeNftHistory extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'address',
    type: DataType.STRING,
  })
  address: string;

  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @Column({
    field: 'contract_address',
    type: DataType.STRING,
  })
  contractAddress: number;

  @Column({
    field: 'token_id',
    type: DataType.STRING,
  })
  tokenId: string;

  @Column({
    field: 'image_url',
    type: DataType.STRING,
  })
  imageUrl: string;

  @Column({
    field: 'rarity',
    type: DataType.STRING,
  })
  rarity: string;

  @Column({
    field: 'tx_hash',
    type: DataType.STRING,
  })
  txHash: string;

  @Column({
    field: 'action',
    type: DataType.STRING,
  })
  action: string;

  @Column({
    field: 'status',
    type: DataType.STRING,
  })
  status: string;

  @CreatedAt
  @Column({
    field: 'action_at',
    type: DataType.TIME(),
  })
  actionAt: Date;

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

export enum StakeAction {
  Stake = 'Stake', //
  UnStake = 'UnStake', //
}

export enum StakeStatus {
  Pending = 'Pending',
  Confirmed = 'Confirmed',
}
