import {
  Column,
  CreatedAt,
  DataType,
  Index,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  Unique,
} from 'sequelize-typescript';
import { StudioContract } from './studio-contract.entity';

@Table({
  tableName: 'studio_contract_item_metadata',
  timestamps: true,
  updatedAt: 'updated_at',
  createdAt: 'created_at',
})
export class StudioContractItemMetadata extends Model<StudioContractItemMetadata> {
  @PrimaryKey
  @Column({ type: DataType.UUID })
  id!: string;

  @ForeignKey(() => StudioContract)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'studio_contract_id',
  })
  studioContractId!: string;

  @Index('studio_contract_item_metadata_studio_contract_id_token_id_index')
  @Unique('studio_contract_item_metadata_studio_contract_id_token_id_unique')
  @Column({ type: DataType.STRING, allowNull: false, field: 'token_id' })
  tokenId!: string;

  @Column({ type: DataType.STRING, field: 'name' })
  name?: string;

  @Column({ type: DataType.STRING, field: 'description' })
  description?: string;

  @Column({ type: DataType.JSONB, field: 'attributes' })
  attributes?: {
    trait_type: string;
    value: string;
  }[];

  @Column({ type: DataType.STRING, field: 'image' })
  image?: string;

  @Column({ type: DataType.STRING, field: 'image_data' })
  imageData?: string;

  @Column({ type: DataType.STRING, field: 'animation_url' })
  animationUrl?: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_revealed',
  })
  isRevealed!: boolean;

  @Column({ type: DataType.STRING, field: 'revealer' })
  revealer?: string;

  @Column({ type: DataType.DATE, field: 'revealed_at' })
  revealedAt?: Date;

  @Column({ type: DataType.STRING, field: 'blindbox_name' })
  blindboxName?: string;

  @Column({ type: DataType.STRING, field: 'blindbox_description' })
  blindboxDescription?: string;

  @Column({ type: DataType.JSONB, field: 'blindbox_attributes' })
  blindboxAttributes?: object;

  @Column({ type: DataType.STRING, field: 'blindbox_image' })
  blindboxImage?: string;

  @Column({ type: DataType.BOOLEAN, field: 'is_minted' })
  isMinted: boolean;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt!: Date;

  @BelongsTo(() => StudioContract)
  studioContract?: StudioContract;
}
