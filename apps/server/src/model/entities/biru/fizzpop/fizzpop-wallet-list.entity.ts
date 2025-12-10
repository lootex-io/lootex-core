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
  tableName: 'fizzpop_wallet_list',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
})
export class FizzpopWalletList extends Model {
  @IsUUID('all')
  @Default(DataType.UUIDV4)
  @PrimaryKey
  @Column({
    field: 'id',
    type: DataType.UUID,
  })
  id: string;

  @Column({
    field: 'wallet',
    type: DataType.STRING,
  })
  wallet: string;

  @Column({
    field: 'list_type',
    type: DataType.STRING,
  })
  listType: string;

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
    field: 'operator_username',
    type: DataType.STRING,
  })
  operatorUsername?: string;

  @Column({
    field: 'reason',
    type: DataType.STRING,
  })
  reason?: string;
}

export enum FizzpopWalletListType {
  blacklist = 'blacklist',
  whitelist = 'whitelist',
}
