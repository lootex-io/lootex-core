import {
  AuthEntityStatus,
  AuthSupportedChainFamily,
  AuthSupportedWalletProviderEnum,
  AuthSupportedWalletTransport,
} from '@/api/v3/auth/auth.interface';
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
  DeletedAt,
  ForeignKey,
  HasOne,
} from 'sequelize-typescript';
import { Account } from '@/model/entities';

@Table({
  tableName: 'user_wallets',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class Wallet extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUID,
  })
  id: string;

  @ForeignKey(() => Account)
  @AllowNull(false)
  @IsUUID('all')
  @Column({
    field: 'account_id',
    type: DataType.UUID,
  })
  accountId: string;

  // @dev transport: Wallet transport type
  //                 Difference in validation method require such identifier,
  //                 and this cannot be asserted solely by wallet product name
  //      'Injected': means it's from browser extension or wallet browser
  //                  e.g. MetaMask extension, MetaMask Mobile browser, Phantom extension, Petra extension
  //      'Contract': means it's from a ERC-1271 compatible wallet (usually Multisig)
  //                  e.g. Blocto Wallet Mobile, Argent Wallet (upcoming Gnosis)
  //      'Library': means it's connected with a library as provider
  //                  e.g. WalletConnect, Flow/Blocto wallet in browser (FLOW), Torus Social Wallet
  @AllowNull(false)
  @Column({
    field: 'transport',
    type: DataType.ENUM('Injected', 'Contract', 'Library'),
  })
  transport: AuthSupportedWalletTransport;

  // @dev should be sync'ed with interface
  @AllowNull(false)
  @Default('OTHERS')
  @Column({
    field: 'provider',
    type: DataType.ENUM(
      'METAMASK_INJECTED',
      'PHANTOM_INJECTED',
      'COINBASE_INJECTED',
      'QUBIC_INJECTED',
      'PETRA_INJECTED',
      'COMPATIBLE_INJECTED',
      'QUBIC_LIBRARY',
      'WALLET_CONNECT_1_LIBRARY',
      'TORUS_LIBRARY',
      'PRIVY_LIBRARY',
      'PRIVY_LIBRARY_SA',
      'FLOW_LIBRARY',
      'BLOCTO_WALLET_MOBILE',
      'TRUST_WALLET_MOBILE',
    ),
  })
  provider: AuthSupportedWalletProviderEnum;

  @AllowNull(false)
  @Default('EVM')
  @Column({
    field: 'chain_family',
    type: DataType.ENUM('ETH', 'SOL', 'FLOW', 'APTOS'),
  })
  chainFamily: AuthSupportedChainFamily;

  @AllowNull(true)
  @Default(false)
  @Column({
    field: 'is_main_wallet',
    type: DataType.BOOLEAN,
  })
  isMainWallet: boolean;

  @AllowNull(false)
  @Column({
    field: 'address',
    type: DataType.STRING,
  })
  address: string;

  @AllowNull(false)
  @Default('ACTIVE')
  @Column({
    field: 'status',
    type: DataType.ENUM('ACTIVE', 'SUSPEND'),
  })
  status: AuthEntityStatus;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'raw_data',
    type: DataType.TEXT,
  })
  rawData: string;

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

  @DeletedAt
  @Column({
    field: 'deleted_at',
    type: DataType.TIME(),
  })
  deletedAt: Date;

  @HasOne(() => Account, {
    foreignKey: 'id',
    sourceKey: 'accountId',
  })
  Account: Account;
}
