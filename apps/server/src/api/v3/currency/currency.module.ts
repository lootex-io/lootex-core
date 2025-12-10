import { Module } from '@nestjs/common';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';
import { CurrencyService as ThirdPartyCurrencyService } from '@/core/third-party-api/currency/currency.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { entities } from '@/model/entities';
import { providers } from '@/model/providers';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [SequelizeModule.forFeature(entities)],
  providers: [
    JwtService,
    CurrencyService,
    ThirdPartyCurrencyService,
    ...providers,
  ],
  controllers: [CurrencyController],
})
export class CurrencyModule {}
