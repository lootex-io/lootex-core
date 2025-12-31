import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
} from 'sequelize-typescript';

@Table({
  tableName: 'collection_trading_board_one_day',
  timestamps: false,
})
export class CollectionTradingBoardOneDay extends Model {
  @PrimaryKey
  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'truncated_time',
  })
  truncatedTime: Date;

  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'chain_id',
  })
  chainId: number;

  @PrimaryKey
  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'contract_address',
  })
  contractAddress: string;

  @Column({
    type: DataType.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: 'trading_volume',
  })
  tradingVolume: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'trading_count',
  })
  tradingCount: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: 'min_floor_price',
  })
  minFloorPrice: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: 'previous_volume',
  })
  previousVolume: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: 'volume_change_percent',
  })
  volumeChangePercent: number;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: 'previous_floor_price',
  })
  previousFloorPrice: number;

  @Column({
    type: DataType.UUID,
    field: 'collection_id',
  })
  collectionId: string;

  @Column({
    type: DataType.FLOAT,
    allowNull: true,
    defaultValue: 0,
    field: 'logo_image_url',
  })
  logoImageUrl: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'name',
  })
  name: string;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_verified',
  })
  isVerified: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'slug',
  })
  slug: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: 'chain_short_name',
  })
  chainShortName: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
    field: 'total_supply',
  })
  totalSupply: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'total_owners',
  })
  totalOwners: number;
}
