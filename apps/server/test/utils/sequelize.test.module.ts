import { ModelCtor, Model } from 'sequelize-typescript';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigurationService } from '@/configuration';

export class TestSequelizeModule {
  public static forRootAsync(models: ModelCtor<Model<any, any>>[]) {
    return SequelizeModule.forRootAsync({
      inject: [ConfigurationService],
      useFactory: async (config: ConfigurationService) => ({
        dialect: 'postgres',
        host: config.get('TEST_POSTGRES_HOST') || 'localhost',
        port: config.get('TEST_POSTGRES_PORT') || 5433,
        username: config.get('TEST_POSTGRES_USERNAME') || 'postgres',
        password: config.get('TEST_POSTGRES_PASSWORD') || 'postgres',
        database: config.get('TEST_POSTGRES_DATABASE') || 'test',
        models,
      }),
    });
  }
}
