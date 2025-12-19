import { SocialPlatform } from '@/api/v3/auth/auth.interface';
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
  tableName: 'account_social_token',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountSocialToken extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @Column({
    field: 'account_id',
    type: DataType.UUIDV4,
  })
  accountId: string;

  @Column({
    field: 'provider',
    type: DataType.STRING(255),
  })
  provider: SocialPlatform;

  @Column({
    field: 'provider_account_id',
    type: DataType.STRING(255),
  })
  providerAccountId: string;

  @Column({
    field: 'access_token',
    type: DataType.STRING(255),
  })
  accessToken: string;

  @Column({
    field: 'refresh_token',
    type: DataType.STRING(255),
  })
  refreshToken: string;

  @Column({
    field: 'name',
    type: DataType.STRING(255),
  })
  name: string;

  @Column({
    field: 'email',
    type: DataType.STRING(255),
  })
  email: string;

  @Column({
    field: 'picture',
    type: DataType.STRING(255),
  })
  picture: string;

  @Column({
    field: 'expires_at',
    type: DataType.TIME(),
  })
  expiresAt: Date;

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
