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
  HasMany,
  BelongsTo,
} from 'sequelize-typescript';

import {
  Contract,
  SeaportOrder,
  Collection,
  Asset,
  AssetTraits,
} from '@/model/entities';
import { BlockStatus } from '@/model/entities/constant-model';
import { IsEnum } from 'class-validator';

@Table({
  tableName: 'asset_extra',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AssetExtra extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: AssetExtra) {
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: AssetExtra) {
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

  @AllowNull(false)
  @Column({
    field: 'asset_id',
    type: DataType.UUIDV4,
  })
  assetId: string;

  @AllowNull(false)
  @Default(-1)
  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @AllowNull(true)
  @Column({
    field: 'contract_id',
    type: DataType.UUIDV4,
  })
  contractId: string;

  @AllowNull(true)
  @Column({
    field: 'collection_id',
    type: DataType.STRING,
  })
  collectionId: string;

  // @AllowNull(true)
  // @Column({
  //   field: 'order_json',
  //   type: DataType.JSONB,
  // })
  // order: any;

  @AllowNull(true)
  @Column({
    field: 'best_offer_order_id',
    type: DataType.UUIDV4,
  })
  bestOfferOrderId: string;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'best_offer_symbol',
    type: DataType.STRING,
  })
  bestOfferSymbol: string;

  @Column({
    field: 'best_offer_per_price',
    type: DataType.REAL,
  })
  bestOfferPerPrice: number;

  @Column({
    field: 'best_offer_platform_type',
    type: DataType.INTEGER,
  })
  bestOfferPlatformType: number;

  @AllowNull(true)
  @Column({
    field: 'best_listing_order_id',
    type: DataType.UUIDV4,
  })
  bestListingOrderId: string;

  @AllowNull(false)
  @Default('')
  @Column({
    field: 'best_listing_symbol',
    type: DataType.STRING,
  })
  bestListingSymbol: string;

  @Column({
    field: 'best_listing_per_price',
    type: DataType.REAL,
  })
  bestListingPerPrice: number;

  @Column({
    field: 'best_listing_platform_type',
    type: DataType.INTEGER,
  })
  bestListingPlatformType: number;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'rarity_ranking',
    type: DataType.INTEGER,
  })
  rarityRanking: number;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'asset_created_at',
    type: DataType.TIME(),
  })
  assetCreatedAt: string;

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
    field: 'last_created_listing_at',
    type: DataType.TIME(),
  })
  lastCreatedListingAt: string;

  @AllowNull(false)
  @Default(0)
  @Column({
    field: 'view_count',
    type: DataType.INTEGER,
  })
  viewCount: number;

  @BelongsTo(() => Asset, {
    foreignKey: 'assetId',
  })
  Asset: Asset;

  @BelongsTo(() => Collection, {
    foreignKey: 'collectionId',
  })
  Collection: Collection;

  @BelongsTo(() => Contract, {
    foreignKey: 'contractId',
  })
  Contract: Contract;

  @BelongsTo(() => SeaportOrder, {
    foreignKey: 'bestOfferOrderId',
  })
  bestOfferOrder: SeaportOrder;

  @BelongsTo(() => SeaportOrder, {
    foreignKey: 'bestListingOrderId',
  })
  bestListingOrder: SeaportOrder;

  bestCollectionOfferOrder: any;

  @HasMany(() => AssetTraits, {
    foreignKey: 'assetId',
  })
  AssetTraits: AssetTraits[];
}
