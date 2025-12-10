import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
@Table({
  tableName: 'global_value',
  timestamps: false,
})
export class GlobalValue extends Model {
  @PrimaryKey
  @Column({
    field: 'key',
    type: DataType.STRING,
  })
  key: string;

  @Column({
    field: 'value',
    type: DataType.STRING,
  })
  value: string;
}
