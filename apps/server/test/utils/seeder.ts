import { Umzug, SequelizeStorage } from 'umzug';
import { Sequelize } from 'sequelize-typescript';

const sequelize = new Sequelize({
  dialect: 'postgres',
  username: process.env.TEST_POSTGRES_USERNAME || 'postgres',
  password: process.env.TEST_POSTGRES_PASSWORD || 'postgres',
  database: process.env.TEST_POSTGRES_DATABASE || 'test',
  host: process.env.TEST_POSTGRES_HOST || 'localhost',
  port: Number(process.env.TEST_POSTGRES_PORT) || 5433,
});

export const seeder = new Umzug({
  migrations: {
    glob: ['src/model/seeders/*.ts', {}],
  },
  context: sequelize,
  storage: new SequelizeStorage({
    sequelize,
    modelName: 'seeder_meta',
  }),
  logger: console,
});

export type Seeder = typeof seeder._types.migration;
