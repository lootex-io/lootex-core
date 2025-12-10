import {
  Column,
  DataType,
  Model,
  Table,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'asset_metadata_failure',
})
export class AssetMetadataFailure extends Model<AssetMetadataFailure> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'chain_id',
  })
  chainId: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'contract_address',
  })
  contractAddress: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'token_id',
  })
  tokenId: string;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    field: 'fail_count',
  })
  failCount: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
    field: 'request_count',
  })
  requestCount: number;

  @Column({
    type: DataType.STRING, // Assuming string type for URL
    field: 'metadata_url',
  })
  metadataUrl: string;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
    field: 'last_failed_at',
  })
  lastFailedAt: Date;

  @Column({
    type: DataType.DATE,
    field: 'next_retry_at',
  })
  nextRetryAt: Date;

  @Column({
    type: DataType.TEXT,
    field: 'error_reason',
  })
  errorReason: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    field: 'is_suspended',
  })
  isSuspended: boolean;

  @CreatedAt
  @Column({ field: 'created_at' })
  createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  updatedAt: Date;
}
