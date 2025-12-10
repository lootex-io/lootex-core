import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'collection_metadata_failure',
  timestamps: true,
  underscored: true,
})
export class CollectionMetadataFailure extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @AllowNull(false)
  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @AllowNull(false)
  @Column({
    field: 'contract_address',
    type: DataType.STRING,
  })
  contractAddress: string;

  @Default('WATCHING')
  @Column(DataType.STRING)
  status: string;

  @Default(0)
  @Column({
    field: 'total_asset_failures',
    type: DataType.INTEGER,
  })
  totalAssetFailures: number;

  @AllowNull(true)
  @Column({
    field: 'suspended_at',
    type: DataType.DATE,
  })
  suspendedAt: Date;

  @AllowNull(true)
  @Column({
    field: 'retry_after',
    type: DataType.DATE,
  })
  retryAfter: Date;

  @CreatedAt
  @Column({
    field: 'created_at',
    type: DataType.DATE,
  })
  createdAt: Date;

  @UpdatedAt
  @Column({
    field: 'updated_at',
    type: DataType.DATE,
  })
  updatedAt: Date;
}
