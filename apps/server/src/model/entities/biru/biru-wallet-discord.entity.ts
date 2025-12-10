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
  tableName: 'biru_discord_wallet',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class BiruDiscordWallet extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'wallet_address',
    type: DataType.STRING,
  })
  walletAddress: string;

  @Column({
    field: 'discord_user_id',
    type: DataType.STRING,
  })
  discordUserId: string;

  @Column({
    field: 'access_token',
    type: DataType.STRING,
  })
  accessToken: string;

  @Column({
    field: 'refresh_token',
    type: DataType.STRING,
  })
  refreshToken: string;

  @Column({
    field: 'email',
    type: DataType.STRING,
  })
  email: string;

  @Column({
    field: 'name',
    type: DataType.STRING,
  })
  name: string;

  @Column({
    field: 'picture',
    type: DataType.STRING,
  })
  picture: string;

  @Column({
    field: 'ip',
    type: DataType.STRING,
  })
  ip: string;

  @Column({
    field: 'area',
    type: DataType.STRING,
  })
  area: string;

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
}
