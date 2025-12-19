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
  tableName: 'biru_store_beer_history',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class StoreBeerHistory extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUIDV4,
  })
  id: string;

  // @Column({
  //   field: 'account_id',
  //   type: DataType.UUID,
  // })
  // accountId: string;

  @Column({
    field: 'wallet',
    type: DataType.STRING,
  })
  wallet: string;

  @Column({
    field: 'type',
    type: DataType.STRING,
  })
  type: string;

  @Column({
    field: 'amount',
    type: DataType.FLOAT,
  })
  amount: number;

  @Column({
    field: 'balance_before',
    type: DataType.FLOAT,
  })
  balanceBefore: number;

  @Column({
    field: 'balance_after',
    type: DataType.FLOAT,
  })
  balanceAfter: number;

  @Column({
    field: 'ref_id',
    type: DataType.UUID,
  })
  refId: number;

  @Column({
    field: 'description',
    type: DataType.STRING,
  })
  description: string;

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

export enum StoreBeerHistoryType {
  redemption = 'redemption',
  stake = 'stake',
  claim = 'claim',
  admin = 'admin',
}
