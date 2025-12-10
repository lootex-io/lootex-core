import {
  AllowNull,
  BelongsTo,
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
import { AccountGpBalance } from '@/model/entities/gp/account-gp-balance.entitiy';
import { IsEnum } from 'class-validator';
import { GpTxEvent } from '@/model/entities/constant-model';

@Table({
  tableName: 'account_gp_balance_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class AccountGpBalanceHistory extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  @Column({
    field: 'gp_balance_id',
    type: DataType.STRING,
  })
  gpBalanceId: string;

  @Column({
    field: 'chain',
    type: DataType.INTEGER,
  })
  chain: number;

  @AllowNull(false)
  @IsEnum(GpTxEvent)
  @Column({
    field: 'event',
    type: DataType.ENUM(...Object.values(GpTxEvent)),
  })
  event: string;

  @Column({
    field: 'amount',
    type: DataType.BIGINT,
  })
  amount: number;

  /**
   * 单位 native token, 依据chainId会有不同
   */
  @Column({
    field: 'gas_fee',
    type: DataType.STRING,
  })
  gasFee: string;

  @Default('')
  @Column({
    field: 'note',
    type: DataType.STRING,
  })
  note: string;

  @Default('')
  @Column({
    field: 'tx_hash',
    type: DataType.STRING,
  })
  txHash: string;

  @Default(null)
  @Column({
    field: 'tx_status',
    type: DataType.INTEGER,
  })
  txStatus: number;

  // event.transaction 才有
  @Default('')
  @Column({
    field: 'transaction_sender',
    type: DataType.STRING,
  })
  transactionSender: string;

  // event.transaction 才有
  @Default('')
  @Column({
    field: 'transaction_nonce',
    type: DataType.STRING,
  })
  transactionNonce: string;

  @AllowNull(true)
  @Default(null)
  @Column({
    field: 'args',
    type: DataType.JSONB,
  })
  args: any;

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

  @BelongsTo(() => AccountGpBalance, {
    foreignKey: 'gpBalanceId',
  })
  accountGpBalance: AccountGpBalance;
}
