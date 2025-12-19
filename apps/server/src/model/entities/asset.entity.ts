import { AssetAsEthAccount } from './asset-as-eth-account.entity';
import {
  DataType,
  Table,
  Column,
  Model,
  AllowNull,
  Default,
  PrimaryKey,
  IsUUID,
  BeforeSave,
  BeforeUpdate,
  HasOne,
  HasMany,
} from 'sequelize-typescript';

import { Contract, SeaportOrderAsset, AssetExtra } from '@/model/entities';

@Table({
  tableName: 'asset',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class Asset extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: Asset) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: Asset) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'data',
    type: DataType.BLOB,
  })
  data: string;

  @Column({
    field: 'token_id',
    type: DataType.STRING,
  })
  tokenId: string;

  @Default('')
  @Column({
    field: 'name',
    type: DataType.STRING,
  })
  name: string;

  @Default('')
  @Column({
    field: 'description',
    type: DataType.STRING,
  })
  description: string;

  @Default('')
  @Column({
    field: 'image_url',
    type: DataType.STRING,
  })
  imageUrl: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'image_data',
    type: DataType.STRING,
    get: function (this: Asset) {
      return this.getDataValue('imageData')?.toString();
    },
  })
  imageData: string;

  @Default('')
  @Column({
    field: 'image_preview_url',
    type: DataType.STRING,
  })
  imagePreviewUrl: string;

  @Default('')
  @Column({
    field: 'external_url',
    type: DataType.STRING,
  })
  externalUrl: string;

  @Default('')
  @Column({
    field: 'animation_url',
    type: DataType.STRING,
  })
  animationUrl: string;

  @Default('')
  @Column({
    field: 'animation_type',
    type: DataType.STRING,
  })
  animationType: string;

  @Default('')
  @Column({
    field: 'google_image_url',
    type: DataType.STRING,
  })
  googleImageUrl: string;

  @Default('')
  @Column({
    field: 'background_color',
    type: DataType.STRING(6),
  })
  backgroundColor: string;

  @Default('NONE')
  @Column({
    field: 'status_on_chain',
    type: DataType.STRING(6),
  })
  statusOnChain: string;

  @Default([])
  @Column({
    field: 'traits',
    type: DataType.JSONB,
  })
  traits: string;

  @Default([])
  @Column({
    field: 'x_traits',
    type: DataType.JSONB,
  })
  Xtraits: string;

  @IsUUID('all')
  @Column({
    field: 'contract_id',
    type: DataType.UUIDV4,
  })
  contractId: string;

  @IsUUID('all')
  @Column({
    field: 'owner_eth_account_id',
    type: DataType.UUIDV4,
  })
  ownerEthAccountId: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'token_uri',
    type: DataType.STRING,
  })
  tokenUri: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'created_at',
    type: DataType.TIME(),
  })
  createdAt: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'updated_at',
    type: DataType.TIME(),
  })
  updatedAt: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'last_updated_at',
    type: DataType.TIME(),
  })
  lastUpdatedAt: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'deleted_at',
    type: DataType.TIME(),
  })
  deletedAt: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @HasOne(() => Contract, {
    foreignKey: 'id',
    sourceKey: 'contractId',
    as: 'Contract',
  })
  Contract: Contract;

  @HasMany(() => AssetAsEthAccount, {
    foreignKey: 'assetId',
    sourceKey: 'id',
    as: 'AssetAsEthAccount',
  })
  AssetAsEthAccount: AssetAsEthAccount[];

  @HasMany(() => SeaportOrderAsset, {
    foreignKey: 'assetId',
    sourceKey: 'id',
    as: 'SOA',
  })
  SOA: SeaportOrderAsset[];

  @AllowNull(true)
  @Column({
    field: 'total_owners',
    type: DataType.INTEGER,
  })
  totalOwners: number;

  @AllowNull(true)
  @Column({
    field: 'total_amount',
    type: DataType.STRING,
  })
  totalAmount: string;

  @HasOne(() => AssetExtra, {
    foreignKey: 'assetId',
  })
  AssetExtra: AssetExtra;
}
