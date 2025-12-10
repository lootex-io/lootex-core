import { DataType, Column, Model, Table } from 'sequelize-typescript';

@Table({})
export class StringTraits extends Model {
  @Column({
    field: 'traitType',
    type: DataType.STRING,
  })
  traitType: string;

  @Column({
    field: 'displayType',
    type: DataType.STRING,
  })
  displayType: string;

  @Column({
    field: 'value',
    type: DataType.STRING,
  })
  value: string;

  @Column({
    field: 'valueCount',
    type: DataType.NUMBER,
    get() {
      return Number(this.getDataValue('valueCount'));
    },
  })
  valueCount: number;
}
