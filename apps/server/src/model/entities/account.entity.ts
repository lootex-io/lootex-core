import { Role } from '../../api/v3/role/role.interface';
import { AuthEntityStatus } from '@/api/v3/auth/auth.interface';
import { IsEmail, IsEnum } from 'class-validator';
import {
  DataType,
  Table,
  Column,
  Model,
  AllowNull,
  Default,
  PrimaryKey,
  IsUUID,
  CreatedAt,
  UpdatedAt,
  HasMany,
  HasOne,
} from 'sequelize-typescript';
import {
  AccountAvatarDecoration,
  AccountBadge,
  AccountSocialToken,
  AvatarDecoration,
  Badge,
  Wallet,
} from '@/model/entities';
import { BlockStatus } from '@/model/entities/constant-model';

@Table({
  tableName: 'user_accounts',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class Account extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUID,
  })
  id: string;

  @AllowNull(false)
  @Default(null)
  @IsEmail()
  @Column({
    field: 'email',
    type: DataType.STRING,
  })
  email: string;

  @AllowNull(false)
  @Column({
    field: 'username',
    type: DataType.STRING,
  })
  username: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'fullname',
    type: DataType.STRING,
  })
  fullname: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'avatar_url',
    type: DataType.STRING,
  })
  avatarUrl: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'introduction',
    type: DataType.TEXT,
  })
  introduction: string;

  @AllowNull(true)
  @Default('ACTIVE')
  @IsEnum(AuthEntityStatus)
  @Column({
    field: 'status',
    type: DataType.ENUM('ACTIVE', 'SUSPEND'),
  })
  status: AuthEntityStatus;

  @AllowNull(true)
  @Default(BlockStatus.NORMAL)
  @IsEnum(BlockStatus)
  @Column({
    field: 'block',
    type: DataType.ENUM(...Object.values(BlockStatus)),
  })
  block: BlockStatus;

  @AllowNull(true)
  @Default([])
  @Column({
    field: 'external_links',
    type: DataType.JSONB,
  })
  externalLinks: string;

  @Default(0)
  @Column({
    field: 'follower',
    type: DataType.INTEGER,
    comment: 'follower num',
  })
  follower: number;

  @HasMany(() => Wallet)
  wallets: Array<Wallet>;

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

  @AllowNull(true)
  @Column({
    field: 'roles',
    type: DataType.ARRAY(DataType.STRING),
  })
  roles: Array<Role>;

  @AllowNull(true)
  @Column({
    field: 'badge_id',
    type: DataType.UUID,
  })
  badgeId: string;

  @AllowNull(true)
  @Column({
    field: 'avatar_decoration_id',
    type: DataType.UUID,
  })
  avatarDecorationId: string;

  @AllowNull(true)
  @Column({
    field: 'referral_code',
    type: DataType.STRING,
  })
  referralCode: string;

  @AllowNull(true)
  @Column({
    field: 's2_blocked',
    type: DataType.BOOLEAN,
  })
  s2Blocked: boolean;

  @AllowNull(true)
  @Column({
    field: 'privy_user_id',
    type: DataType.STRING,
  })
  privyUserId: string;

  @AllowNull(true)
  @Column({
    field: 'last_login_at',
    type: DataType.DATE,
  })
  lastLoginAt: Date;

  @AllowNull(true)
  @Column({
    field: 'register_ip',
    type: DataType.STRING,
  })
  registerIp: string;

  @AllowNull(true)
  @Column({
    field: 'register_area',
    type: DataType.STRING,
  })
  registerArea: string;

  @AllowNull(true)
  @Column({
    field: 'last_login_ip',
    type: DataType.STRING,
  })
  lastLoginIp: string;

  @AllowNull(true)
  @Column({
    field: 'last_login_area',
    type: DataType.STRING,
  })
  lastLoginArea: string;

  @HasMany(() => AccountBadge, {
    foreignKey: 'accountId',
    sourceKey: 'id',
  })
  Badges: Array<AccountBadge>;

  @HasOne(() => Badge, {
    foreignKey: 'id',
    sourceKey: 'badgeId',
  })
  Badge: Badge;

  @HasOne(() => AvatarDecoration, {
    foreignKey: 'id',
    sourceKey: 'avatarDecorationId',
  })
  AvatarDecoration: AvatarDecoration;

  @HasMany(() => AccountAvatarDecoration, {
    foreignKey: 'accountId',
    sourceKey: 'id',
  })
  AvatarDecorations: Array<AccountAvatarDecoration>;

  @HasMany(() => AccountSocialToken, {
    foreignKey: 'accountId',
    sourceKey: 'id',
  })
  AccountSocialTokens: Array<AccountSocialToken>;
}
