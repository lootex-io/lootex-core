import {
  AllowNull,
  Column,
  CreatedAt,
  DataType,
  Default,
  HasOne,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { StudioContract } from '@/model/entities';

@Table({
  tableName: 'studio_contract_upload_item',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StudioContractUploadItem extends Model {
  static STATUS_INIT = 0;
  static STATUS_S3 = 1;
  static STATUS_IPFS = 2;

  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @AllowNull(true)
  @Column({
    field: 'contract_id',
    type: DataType.UUID,
  })
  contractId: string;

  @Default('')
  @Column({
    field: 'file_name',
    type: DataType.STRING,
  })
  fileName: string;

  @Default('')
  @Column({
    field: 'file_key',
    type: DataType.STRING,
  })
  fileKey: string;

  @Default('')
  @Column({
    field: 'token_uri',
    type: DataType.STRING,
  })
  tokenUri: string;

  @Default('')
  @Column({
    field: 'file_ipfs_uri',
    type: DataType.STRING,
  })
  fileIpfsUri: string;

  @Default('')
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

  @Default(null)
  @Column({
    field: 'traits',
    type: DataType.JSONB,
    allowNull: true,
  })
  traits: string;

  // sort by index
  @Default(0)
  @Column({
    field: 'index',
    type: DataType.INTEGER,
  })
  index: number;

  @Column({
    field: 'upload_s3_at',
    type: DataType.TIME(),
    allowNull: true,
  })
  uploadS3At: Date;

  @Column({
    field: 'upload_ipfs_at',
    type: DataType.TIME(),
    allowNull: true,
  })
  uploadIpfsAt: Date;

  @Default(StudioContractUploadItem.STATUS_INIT)
  @Column({
    field: 'status',
    type: DataType.INTEGER,
  })
  status: number;

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

  @HasOne(() => StudioContract, {
    foreignKey: 'id',
    sourceKey: 'contractId',
    as: 'StudioContract',
  })
  StudioContract: StudioContract;
}
