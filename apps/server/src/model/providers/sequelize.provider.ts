import { Sequelize } from 'sequelize-typescript';

export const sequelizeProvider = {
  provide: 'SEQUELIZE',
  useExisting: Sequelize,
};
