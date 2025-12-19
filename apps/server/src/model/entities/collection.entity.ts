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

import { CollectionVolumeAllDays } from './collection-volume-all-days.entity';
import { CollectionVolumeThirtyDays } from './collection-volume-thirty-days.entity';
import { CollectionVolumeSevenDays } from './collection-volume-seven-days.entity';
import { CollectionVolumeToday } from './collection-volume-today.entity';
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

  @Default(false)
  @Column({
    field: 'is_gold_verified',
    type: DataType.BOOLEAN,
  })
  isGoldVerified: boolean;

  @Default(false)
  @Column({
    field: 'is_rarity',
    type: DataType.BOOLEAN,
  })
  isRarity: boolean;

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

  @Default(true)
  @Column({
    field: 'can_native_trade',
    type: DataType.BOOLEAN,
  })
  canNativeTrade: boolean;

  @Column({
    field: 'allow_erc20_trade_addresses',
    type: DataType.ARRAY(DataType.STRING),
  })
  allowErc20TradeAddresses: string[];

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

  @HasOne(() => CollectionVolumeAllDays, {
    foreignKey: 'collectionId',
    sourceKey: 'id',
  })
  CollectionVolumeAllDays: CollectionVolumeAllDays;

  @HasOne(() => CollectionVolumeThirtyDays, {
    foreignKey: 'collectionId',
    sourceKey: 'id',
  })
  CollectionVolumeThirtyDays: CollectionVolumeThirtyDays;

  @HasOne(() => CollectionVolumeSevenDays, {
    foreignKey: 'collectionId',
    sourceKey: 'id',
  })
  CollectionVolumeSevenDays: CollectionVolumeSevenDays;

  @HasOne(() => CollectionVolumeToday, {
    foreignKey: 'collectionId',
    sourceKey: 'id',
  })
  CollectionVolumeToday: CollectionVolumeToday;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'safelist_status',
  })
  safelistStatus: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'category',
  })
  category: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    field: 'is_disabled',
  })
  isDisabled: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    field: 'is_nsfw',
  })
  isNsfw: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'project_url',
  })
  projectUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'wiki_url',
  })
  wikiUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'discord_url',
  })
  discordUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'telegram_url',
  })
  telegramUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'twitter_username',
  })
  twitterUsername: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'instagram_username',
  })
  instagramUsername: string;

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

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    field: 'is_revealable',
    defaultValue: false,
  })
  isRevealable: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'can_reveal_at',
  })
  canRevealAt: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'reveal_url',
  })
  revealUrl: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    field: 'is_stakeable',
    defaultValue: false,
  })
  isStakeable: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'stake_url',
  })
  stakeUrl: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    field: 'is_discord_verify',
    defaultValue: false,
  })
  isDiscordVerify: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'discord_verify_url',
  })
  discordVerifyUrl: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true,
    field: 'is_redeemable',
    defaultValue: false,
  })
  isRedeemable: boolean;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'can_redeem_at',
  })
  canRedeemAt: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    field: 'redeem_url',
  })
  redeemUrl: string;
}
