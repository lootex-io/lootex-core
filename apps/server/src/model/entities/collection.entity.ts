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
  BelongsTo,
} from 'sequelize-typescript';
import { IsEnum } from 'class-validator';
import { BlockStatus } from '@/model/entities/constant-model';

import { SeaportOrder } from './seaport-order.entity';

export enum ChainShortNameEnum {
  ETH = 'ETH',
  POLYGON = 'POLYGON',
  BSC = 'BSC',
  AVAX = 'AVAX',
  ARBITRUM = 'ARBITRUM',
  FLOW = 'FLOW',
  SOL = 'SOL',
  APTOS = 'APTOS',
  ETH_TESTNET = 'ETH_TESTNET',
  POLYGON_TESTNET = 'POLYGON_TESTNET',
  BSC_TESTNET = 'BSC_TESTNET',
  AVAX_TESTNET = 'AVAX_TESTNET',
  ARBITRUM_TESTNET = 'ARBITRUM_TESTNET',
  FLOW_TESTNET = 'FLOW_TESTNET',
  SOL_TESTNET = 'SOL_TESTNET',
  APTOS_TESTNET = 'APTOS_TESTNET',
}

@Table({
  tableName: 'collections',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class Collection extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: Collection) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
    if (instance.contractAddress) {
      instance.contractAddress = instance.contractAddress.toLowerCase();
    }
    if (instance.ownerAddress) {
      instance.ownerAddress = instance.ownerAddress.toLowerCase();
    }
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: Collection) {
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

  @IsUUID('all')
  @Column({
    field: 'owner_account_id',
    type: DataType.UUIDV4,
  })
  ownerAccountId: string;

  @AllowNull(true)
  @Column({
    field: 'owner_address',
    type: DataType.STRING,
  })
  ownerAddress: string;

  @AllowNull(false)
  @Default('ETH')
  @IsEnum(ChainShortNameEnum)
  @Column({
    field: 'chain_short_name',
    type: DataType.ENUM(
      'ETH',
      'POLYGON',
      'BSC',
      'AVAX',
      'ARBITRUM',
      'FLOW',
      'SOL',
      'APTOS',
      'ETH_TESTNET',
      'POLYGON_TESTNET',
      'BSC_TESTNET',
      'AVAX_TESTNET',
      'ARBITRUM_TESTNET',
      'FLOW_TESTNET',
      'SOL_TESTNET',
      'APTOS_TESTNET',
    ),
  })
  chainShortName: ChainShortNameEnum;

  @AllowNull(false)
  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'contract_address',
    type: DataType.STRING,
  })
  contractAddress: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'banner_image_url',
    type: DataType.STRING,
  })
  bannerImageUrl: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'featured_image_url',
    type: DataType.STRING,
  })
  featuredImageUrl: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'featured_video_url',
    type: DataType.STRING,
  })
  featuredVideoUrl: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'logo_image_url',
    type: DataType.STRING,
  })
  logoImageUrl: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'name',
    type: DataType.STRING,
  })
  name: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'slug',
    type: DataType.STRING,
  })
  slug: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'description',
    type: DataType.STRING,
  })
  description: string;

  @AllowNull(true)
  @Default([])
  @Column({
    field: 'external_links',
    type: DataType.JSONB,
  })
  externalLinks: string;

  @Default(false)
  @Column({
    field: 'is_verified',
    type: DataType.BOOLEAN,
  })
  isVerified: boolean;

  /**
   * 目前主要是 moralis 返回
   */
  @Default(true)
  @Column({
    field: 'verified_collection',
    type: DataType.BOOLEAN,
  })
  verifiedCollection: boolean;

  @Default(false)
  @Column({
    field: 'is_sensitive',
    type: DataType.BOOLEAN,
  })
  isSensitive: boolean;

  @Default(2.5)
  @Column({
    field: 'service_fee',
    type: DataType.FLOAT,
    validate: {
      min: 2.5,
      max: 100,
    },
  })
  serviceFee: number;

  @Default(0)
  @Column({
    field: 'creator_fee',
    type: DataType.FLOAT,
    validate: {
      min: 0,
      max: 100,
    },
  })
  creatorFee: number;

  @Default(false)
  @Column({
    field: 'is_creator_fee',
    type: DataType.BOOLEAN,
  })
  isCreatorFee: boolean;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'creator_fee_address',
    type: DataType.STRING,
  })
  creatorFeeAddress: string;

  @AllowNull(true)
  @Default(BlockStatus.NORMAL)
  @IsEnum(BlockStatus)
  @Column({
    field: 'block',
    type: DataType.ENUM(...Object.values(BlockStatus)),
  })
  block: BlockStatus;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'official_address',
    type: DataType.STRING,
  })
  officialAddress: string;

  @AllowNull(true)
  @Default(false)
  @Column({
    field: 'is_minting',
    type: DataType.BOOLEAN,
  })
  isMinting: boolean;

  @Default(false)
  @Column({
    field: 'is_drop',
    type: DataType.BOOLEAN,
  })
  isDrop: boolean;

  // 总listing订单数
  @Default(0)
  @Column({
    field: 'total_listing',
    type: DataType.INTEGER,
  })
  totalListing: number;

  // 总offer订单数
  @Default(0)
  @Column({
    field: 'total_offer',
    type: DataType.INTEGER,
  })
  totalOffer: number;

  @AllowNull(true)
  @Default(false)
  @Column({
    field: 'is_campaign_202408_featured',
    type: DataType.BOOLEAN,
  })
  isCampaign202408Featured: boolean;

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
    field: 'deleted_at',
    type: DataType.TIME(),
  })
  deletedAt: string;

  @BelongsTo(() => SeaportOrder, {
    foreignKey: 'bestCollectionOfferOrderId',
    targetKey: 'id',
    as: 'bestCollectionOfferOrder',
  })
  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'best_collection_offer_order_id',
  })
  bestCollectionOfferOrderId: string;
}
