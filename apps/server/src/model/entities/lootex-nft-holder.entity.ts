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
  tableName: 'lootex_nft_holder',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class LootexNftHolder extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'category',
    type: DataType.STRING,
  })
  category: string;

  @Column({
    field: 'name',
    type: DataType.STRING,
  })
  name: string;

  @Column({
    field: 'token_id',
    type: DataType.STRING,
  })
  tokenId: string;

  @Column({
    field: 'owner_address',
    type: DataType.STRING,
  })
  ownerAddress: string;

  @Column({
    field: 'contract_address',
    type: DataType.STRING,
  })
  contractAddress: string;

  @Column({
    field: 'acquisition_date',
    type: DataType.TIME(),
  })
  acquisitionDate: string;

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

  @Column({
    field: 'deleted_at',
    type: DataType.TIME(),
  })
  deletedAt: Date;
}
