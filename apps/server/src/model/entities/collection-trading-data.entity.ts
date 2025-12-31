import {
  DataType,
  Table,
  Column,
  Model,
  Default,
  PrimaryKey,
  IsUUID,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';

// create table collection_trading_data
// (
//     id               uuid                      not null
//         constraint collection_trading_data_pk
//             primary key,
//     contract_address varchar                   not null,
//     chain_id         integer                   not null,
//     trading_volume   numeric,
//     trading_count    integer,
//     floor_price      numeric,
//     time             timestamptz               not null,
//     created_at       timestamptz default now() not null,
//     updated_at       timestamptz default now() not null
// );

@Table({
  tableName: 'collection_trading_data',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class CollectionTradingData extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'chain_id',
    type: DataType.INTEGER,
  })
  chainId: number;

  @Column({
    field: 'contract_address',
    type: DataType.STRING,
  })
  contractAddress: string;

  @Column({
    field: 'trading_volume',
    type: DataType.REAL,
  })
  tradingVolume: number;

  @Column({
    field: 'trading_count',
    type: DataType.INTEGER,
  })
  tradingCount: number;

  @Column({
    field: 'floor_price',
    type: DataType.REAL,
  })
  floorPrice: number;

  @Column({
    field: 'time',
    type: DataType.DATE,
  })
  time: Date;

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
