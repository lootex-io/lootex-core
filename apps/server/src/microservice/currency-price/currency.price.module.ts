import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from '@/common/health/health.module';
import { CurrencyTasksService } from '@/microservice/currency-price/currency.price.service';
import { CurrencyService as ThirdPartyCurrencyService } from '@/core/third-party-api/currency/currency.service';
import { CurrencyService } from '@/api/v3/currency/currency.service';
import { ConfigurationService } from '@/configuration';
import { CoreModule } from '@/core/core.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { providers } from '@/model/providers';

@Module({
  imports: [
    CoreModule.forRoot(),
    HealthModule.forRootAsync({
      inject: [ConfigurationService],
      useFactory: async (config: ConfigurationService) => ({
        redis: {
          enabled: true,
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
    }),
    ScheduleModule.forRoot(),
    SequelizeModule.forFeature(entities),
  ],
  providers: [
    CurrencyTasksService,
    CurrencyService,
    ThirdPartyCurrencyService,
    ...providers,
  ],
})
export class CurrencyPriceModule {}
