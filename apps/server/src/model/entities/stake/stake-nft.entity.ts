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
 * 质押的nft
 */
@Table({
  tableName: 'stake_nft',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StakeNft extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  // @Column({
  //   field: 'asset_id',
  //   type: DataType.STRING,
  // })
  // assetId: string;

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

  @Default(false)
  @Column({
    field: 'is_staking',
    type: DataType.BOOLEAN,
  })
  isStaking: boolean;

  @Column({
    field: 'stake_hash',
    type: DataType.STRING,
  })
  stakeHash: string;

  @Column({
    field: 'unstake_hash',
    type: DataType.STRING,
  })
  unStakeHash: string;

  @Column({
    field: 'status',
    type: DataType.STRING,
  })
  status: string;

  /**
   * 质押时间
   */
  @CreatedAt
  @Column({
    field: 'staked_at',
    type: DataType.TIME(),
  })
  stakedAt: Date;

  /**
   * 解除质押时间
   */
  @CreatedAt
  @Column({
    field: 'unstaked_at',
    type: DataType.TIME(),
  })
  unStakedAt: Date;

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

export enum StakeRarity {
  Normal = 'Normal', // 普通
  Rare = 'Rare', // 稀有
  Epic = 'Epic', // 史诗
  Commemorative = 'Commemorative', // 史诗
  Legend = 'Legend', // 传奇
}

export enum StakeNftStatus {
  None = 'None',
  StakePending = 'StakePending',
  StakeConfirmed = 'StakeConfirmed',
  UnStakePending = 'UnStakePending',
  UnStakeConfirmed = 'UnStakeConfirmed',
}
