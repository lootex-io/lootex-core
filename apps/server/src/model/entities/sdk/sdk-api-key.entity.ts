import {
  Column,
  CreatedAt,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';

@Table({
  tableName: 'sdk_api_key',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class SdkApiKey extends Model {
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.STRING,
  })
  id: string;

  @Column({
    field: 'account_id',
    type: DataType.STRING,
  })
  accountId: string;

  @Column({
    field: 'partner',
    type: DataType.STRING,
  })
  partner: string;

  @Column({
    field: 'key',
    type: DataType.STRING,
  })
  key: string;

  @Column({
    field: 'rsa_private_key',
    type: DataType.STRING,
  })
  rsaPrivateKey: string;

  @Column({
    field: 'rsa_public_key',
    type: DataType.STRING,
  })
  rsaPublicKey: string;

  @Column({
    field: 'env',
    type: DataType.STRING,
  })
  env: string; //dev, prod

  @Column({
    field: 'domains',
    type: DataTypes.ARRAY(DataTypes.STRING),
  })
  domains: string[];

  @Column({
    field: 'white_ips',
    type: DataTypes.ARRAY(DataTypes.STRING),
  })
  whiteIps: string[];

  @Default(true)
  @Column({
    field: 'enabled',
    type: DataType.BOOLEAN,
  })
  enabled: boolean;

  @Default(1024) // MB / day ?
  @Column({
    field: 'bandwidth',
    type: DataType.INTEGER,
  })
  bandwidth: number;

  @Column({
    field: 'bundler_key',
    type: DataType.STRING,
  })
  bundlerKey: string;

  @Column({
    field: 'paymaster_key',
    type: DataType.JSONB,
  })
  paymasterKey: string;

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
