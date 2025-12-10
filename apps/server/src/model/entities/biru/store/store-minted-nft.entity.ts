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

@Table({
  tableName: 'biru_store_minted_nft',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StoreMintedNft extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'redemption_id',
    type: DataType.UUID,
  })
  redemptionId: string;

  @Column({
    field: 'product_id',
    type: DataType.UUID,
  })
  productId: string;

  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @Column({
    field: 'address',
    type: DataType.STRING,
  })
  address: string;

  @Column({
    field: 'quantity',
    type: DataType.INTEGER,
  })
  quantity: number;

  // @Column({
  //   field: 'owner_address',
  //   type: DataType.STRING,
  // })
  // wallet: string;

  @Column({
    field: 'wallet',
    type: DataType.STRING,
  })
  wallet: string;

  @Column({
    field: 'minted_at',
    type: DataType.TIME(),
  })
  mintedAt: string;

  @Column({
    field: 'tx_id',
    type: DataType.STRING,
  })
  txId: string;

  @Column({
    field: 'tx_hash',
    type: DataType.STRING,
  })
  txHash: string;

  @Column({
    field: 'status',
    type: DataType.STRING,
  })
  status: string;

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

/**
 * status from mint api
 */
export enum MintedNftStatus {
  pending = 'pending',
  completed = 'completed',
  fail = 'fail',
}
