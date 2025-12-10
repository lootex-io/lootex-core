import { DataType, Column, Model, Table } from 'sequelize-typescript';

@Table({})
export class NumberTraits extends Model {
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
    field: 'valueMin',
    type: DataType.NUMBER,
    get() {
      return Number(this.getDataValue('valueMin'));
    },
  })
  valueMin: number;

  @Column({
    field: 'valueMax',
    type: DataType.NUMBER,
    get() {
      return Number(this.getDataValue('valueMax'));
    },
  })
  valueMax: number;

  @Column({
    field: 'valueCount',
    type: DataType.NUMBER,
    get() {
      return Number(this.getDataValue('valueCount'));
    },
  })
  valueCount: number;
}
