import { Blockchain, Asset } from '@/model/entities';
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
  BelongsTo,
  ForeignKey,
  HasOne,
  HasMany,
} from 'sequelize-typescript';

@Table({
  tableName: 'contract',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class Contract extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: Contract) {
    const now = new Date().toISOString();
    instance.updatedAt = now;

    if (instance.address) {
      instance.address = instance.address.toLowerCase();
    }
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: Contract) {
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
    field: 'address',
    type: DataType.STRING,
    get: function (this: Contract) {
      return this.getDataValue('address')?.toString();
    },
  })
  address: string;

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
    field: 'description',
    type: DataType.STRING,
  })
  description: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'image_url',
    type: DataType.STRING,
  })
  imageUrl: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'icon_url',
    type: DataType.STRING,
  })
  iconUrl: string;

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
    field: 'external_url',
    type: DataType.STRING,
  })
  externalUrl: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'schema_name',
    type: DataType.STRING,
  })
  schemaName: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'symbol',
    type: DataType.STRING,
  })
  symbol: string;

  @IsUUID('all')
  @ForeignKey(() => Blockchain)
  @Column({
    field: 'blockchain_id',
    type: DataType.UUIDV4,
  })
  blockchainId: string;

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

  @AllowNull(false)
  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'total_supply',
    type: DataType.STRING,
  })
  totalSupply: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'total_owners',
    type: DataType.STRING,
  })
  totalOwners: string;

  @HasMany(() => Asset, {
    foreignKey: 'contractId',
    sourceKey: 'id',
  })
  asset: Asset[];

  @BelongsTo(() => Blockchain)
  blockchain: Blockchain;

  @HasOne(() => Blockchain, {
    foreignKey: 'id',
    sourceKey: 'blockchainId',
    as: 'Blockchain',
  })
  Blockchain: Blockchain;
}
