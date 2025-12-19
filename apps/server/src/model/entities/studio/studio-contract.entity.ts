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
  HasMany,
} from 'sequelize-typescript';
import { Account } from '../account.entity';
import { StudioContractDrop } from './studio-contract-drop.entity';

@Table({
  tableName: 'studio_contract',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StudioContract extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'id',
  })
  id: string;

  @ForeignKey(() => Account)
  @Column({
    type: DataType.UUID,
    allowNull: true,
    field: 'owner_account_id',
  })
  ownerAccountId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'name',
  })
  name: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'chain_id',
  })
  chainId: number;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'address',
  })
  address: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'schema_name',
  })
  schemaName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'description',
  })
  description: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'status',
  })
  status: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'symbol',
  })
  symbol: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'logo_image_url',
  })
  logoImageUrl: string;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    field: 'is_visible',
  })
  isVisible: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'ipfs_route',
  })
  ipfsRoute: string;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    field: 'is_blindbox',
  })
  isBlindbox: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'blindbox_url',
  })
  blindboxUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'blindbox_name',
  })
  blindboxName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'blindbox_description',
  })
  blindboxDescription: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    field: 'blindbox_traits',
  })
  blindboxTraits: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'blindbox_ipfs_uri',
  })
  blindboxIpfsUri: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'blindbox_key',
  })
  blindboxKey: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'creator_address',
  })
  creatorAddress: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'owner_address',
  })
  ownerAddress: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    field: 'drop_fee_info',
  })
  dropFeeInfo: object;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    field: 'is_creator_fee',
  })
  isCreatorFee: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'creator_fee_address',
  })
  creatorFeeAddress: string;

  @Column({
    type: DataType.DECIMAL,
    allowNull: true,
    field: 'creator_fee',
  })
  creatorFee: number;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    field: 'is_start_drop',
  })
  isStartDrop: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'drop_name',
  })
  dropName: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'drop_description',
  })
  dropDescription: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: true,
    field: 'drop_urls',
  })
  dropUrls: string[];

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    field: 'is_revealed',
  })
  isRevealed: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'mode',
  })
  mode: string;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    field: 'is_launchpad_hidden',
  })
  isLaunchpadHidden: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: 'launchpad_rank',
  })
  launchpadRank: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'can_reveal_at',
  })
  canRevealAt: Date;

  @Default(false)
  @Column({
    type: DataType.BOOLEAN,
    field: 'is_centralized_metadata',
  })
  isCentralizedMetadata: boolean;

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

  @HasMany(() => StudioContractDrop)
  drops: StudioContractDrop[];
}
