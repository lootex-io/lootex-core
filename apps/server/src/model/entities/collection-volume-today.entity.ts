import {
  DataType,
  Table,
  Column,
  Model,
  Default,
  PrimaryKey,
  IsUUID,
  HasOne,
} from 'sequelize-typescript';

import { Collection } from '@/model/entities';

@Table({
  tableName: 'collection_volume_today',
  timestamps: false,
})
export class CollectionVolumeToday extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'collection_id',
    type: DataType.UUIDV4,
  })
  collectionId: string;

  @HasOne(() => Collection, {
    foreignKey: 'id',
    sourceKey: 'collectionId',
    as: 'Collection',
  })
  Collection: Collection;

  @Column({
    field: 'volume',
    type: DataType.REAL,
  })
  volume: number;

  @Column({
    field: 'count',
    type: DataType.INTEGER,
  })
  count: number;

  @Column({
    field: 'contract_address',
    type: DataType.STRING,
  })
  contractAddress: string;

  @Column({
    field: 'chain_short_name',
    type: DataType.STRING,
  })
  chainShortName: string;
}
