import {
  DataType,
  Table,
  Column,
  Model,
  AllowNull,
  Default,
  PrimaryKey,
  IsUUID,
  BeforeSave,
  BeforeUpdate,
  HasOne,
  BeforeCreate,
} from 'sequelize-typescript';

import { EthAccount, Asset, Wallet } from '@/model/entities';

@Table({
  tableName: 'asset_as_eth_account',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AssetAsEthAccount extends Model {
  @BeforeSave
  static setDefaultTimeWhenSave(instance: AssetAsEthAccount) {
    this._lowerCaseOwnerAddress(instance);
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeUpdate
  static setDefaultTimeWhenUpdate(instance: AssetAsEthAccount) {
    this._lowerCaseOwnerAddress(instance);
    const now = new Date().toISOString();
    instance.updatedAt = now;
  }

  @BeforeCreate
  static lowerCaseOwnerAddressWhenCreate(instance: AssetAsEthAccount) {
    this._lowerCaseOwnerAddress(instance);
  }

  static _lowerCaseOwnerAddress(instance: AssetAsEthAccount) {
    instance.ownerAddress = instance.ownerAddress?.toLowerCase();
  }

  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @IsUUID('all')
  @Column({
    field: 'asset_id',
    type: DataType.UUIDV4,
  })
  assetId: string;

  @IsUUID('all')
  @Column({
    field: 'contract_id',
    type: DataType.UUIDV4,
  })
  contractId: string;

  @IsUUID('all')
  @Column({
    field: 'eth_account_id',
    type: DataType.UUIDV4,
  })
  ethAccountId: string;

  @AllowNull(true)
  @Default('0')
  @Column({
    field: 'quantity',
    type: DataType.STRING,
  })
  quantity: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'owner_address',
    type: DataType.STRING,
  })
  ownerAddress: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'created_at',
    type: DataType.TIME(),
  })
  createdAt: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'updated_at',
    type: DataType.TIME(),
  })
  updatedAt: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'deleted_at',
    type: DataType.TIME(),
  })
  deletedAt: string;

  @HasOne(() => EthAccount, {
    foreignKey: 'id',
    sourceKey: 'ethAccountId',
    as: 'Account',
  })
  Account: EthAccount;

  @HasOne(() => Asset, { foreignKey: 'id', sourceKey: 'assetId', as: 'Asset' })
  Asset: Asset;

  @HasOne(() => Wallet, {
    foreignKey: 'address',
    sourceKey: 'ownerAddress',
    as: 'Wallet',
  })
  Wallet: Wallet;
}
